
var express = require('express');
var http = require('http');
var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('sambot.db');
var Sequelize = require('sequelize');

var request = require('request');
var app = express();
var bodyParser = require('body-parser')
var yaml = require('node-yaml')

// JSON BODY PARSER
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(express.json());
app.use(express.urlencoded());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var cocktails = yaml.readSync('cocktails.yaml');
var alcohols = yaml.readSync('alcohols.yaml');
var dico = yaml.readSync('dict.yaml');
console.log(alcohols.whisky.types)
//initialization of database
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  // SQLite only
  storage: 'test.db'
});
////
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
////
const User = sequelize.define('users', {
  firstName: {
    type: Sequelize.STRING
  },
  messengerId: {
    type: Sequelize.INTEGER
  }
});

const Session = sequelize.define('sessions', {
  endedAt: {
    type: Sequelize.DATE,
    allowNull: true
  },
  userId: {
    type: Sequelize.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  }
});

const Drink = sequelize.define('drinks', {
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'liquide'
  },
  quantity: {
    type: Sequelize.FLOAT,
    allowNull: false,
    defaultValue: '4 cL'
  },
  sessionId: {
    type: Sequelize.INTEGER,
    references: {
      model: Session,
      key: 'id'
    },
    field: 'session_id'
  }
});

const Alcohol = sequelize.define('alcohols', {
  name: {
    type: Sequelize.STRING
  },
  degree: {
    type: Sequelize.FLOAT
  }

});

Drink.belongsTo(Alcohol);

User.sync({force: false}).then(() => {
  // Table created
  User.findAll().then(users => {
    // console.log(users)
  });
});

Session.sync({force: false}).then(() => {
  // Table created
  Session.findAll().then(sessions => {
    // console.log(sessions)
  });
});

Drink.sync({force: true}).then(() => {
  // Table created
  Drink.findAll().then(drinks => {
    // console.log(drinks)
  });
});

Alcohol.sync({force: false}).then(() => {
  Alcohol.create({
    name: 'vodka',
    degree: 37.5
  }).then();
  Alcohol.create({
    name: 'champagne',
    degree: 12.5
  }).then();
  Alcohol.create({
    name: 'coca',
    degree: 0
  }).then();
});

////// misc functions
function first_check(req, res, callback) {
  res.setHeader('Content-Type', 'text/plain');
  User.findOne({where: {messengerId: req.body['messenger user id']}, }).then(user => {
    if (user == null) {
      console.log('no user in base');
      res.json({
        "redirect_to_blocks": ["Welcome message"]
      });
      res.status(200);
    } else {
      console.log('user found');
      callback(req, res, user);
    }
  });
}
function nlu_cocktail(user_input) {
  var keys = Object.keys(dico);
  console.log(keys)
  user_input = user_input.toLowerCase();
  var result = 'null';
  for (var i=0; i<keys.length; i++) {
    if (dico[keys[i]].includes(user_input)) {
      result = keys[i];
    }
  }
  return result
}
function nlu_quantity(user_input) {
  console.log(user_input)
  return parseFloat(user_input)
}

/// POST/GET methods
app.post('/sam/fuel/new_user', function(req, res){
  console.log('-------- NEW-USER -------')
  console.log(req.body, req.body['messenger user id']);
  res.setHeader('Content-Type', 'text/plain');
  User.findOrCreate({where: {messengerId: req.body['messenger user id']}, defaults: {firstName: req.body['first name']}})
    .spread((user, created) => {
      console.log(user.get({
        plain: true
      }))
      console.log(created)
      res.json({
        "messages":[user.dataValues, {'created':created}]
      });
      res.status(200);
    })
});

app.post('/sam/fuel/start_session', function(req, res) {
  console.log('-------- START-SESSION -------')
  res.setHeader('Content-Type', 'text/plain');
  User.findOne({where: {messengerId: req.body['messenger user id']}, }).then(user => {
    if (user == null) {
      res.json({
        "redirect_to_blocks": ["Welcome message"]
      });
      res.status(200);
    } else {
      Session.findOrCreate({where: {userId: user.dataValues.id, endedAt: null}}).spread((user, created)=>{
        console.log(user.get({
          plain: true
        }))
        console.log(created);
        var messages = []
        if (!created) {
          messages.push({'text': "La soirée n'est pas finie à ce que je sache ! 🙃"});
        }
        res.json({
          "messages": messages,
          "redirect_to_blocks": ["standby"]
        });
        res.status(200);
      })
    }
  })
});

app.post('/sam/fuel/end_session', function(req, res) {
  console.log('-------- END-SESSION -------')
  res.setHeader('Content-Type', 'text/plain');
  var date = new Date();
  User.findOne({where: {messengerId: req.body['messenger user id']}, }).then(user => {
    if (user == null) {
      res.json({
        "redirect_to_blocks": ["Welcome message"]
      });
      res.status(200);
    } else {
      Session.update({endedAt: date}, {where: {userId: user.dataValues.id, endedAt: null}}).then((count)=>{
        console.log(count);
        if(count == 1){
          res.json({
            "messages": [{"text": "Allez, au dodo !"}]
          });
          res.status(200);
        } else {
          res.json({
            "messages": [
              {
                'text':"Si je ne m'abuse, la soirée est déjà finie ? 😝",
                "redirect_to_blocks": ["idle"]
            }],

          });
          res.status(200);
        }
      })
    }
  })
});

app.post('/sam/fuel/add_drink', function(req, res){
  console.log('-------- ADD-DRINK -------')
  res.setHeader('Content-Type', 'text/plain');
  console.log(req.body);
  User.findOne({where: {messengerId: req.body['messenger user id']}, }).then(user => {
    if (user == null) {
      res.json({
        "redirect_to_blocks": ["Welcome message"]
      });
      res.status(200);
    } else {
      Session.findOne({where: {userId: user.dataValues.id, endedAt: null}}).then((session)=>{
        console.log(session.dataValues);
        if(session == null) {
          res.json({
            "messages": [
              {
                "text": "Tu ne m'as pas prévenu que les festivités avaient commencé !",
                "quick_replies": [
                  {
                    "title":"Yes, je me la colle 🍺",
                    "block_names":["Welcome message"]
                  },
                  {
                    "title":"Pardon fausse manip",
                    "block_names":["idle"]
                  }
                ]
              }],

            });
            res.status(200);
        } else {
          var cocktail_slug = nlu_cocktail(req.body.alcohol_type);
          var quantity = 0;
          if (req.body.quantity != undefined && req.body.quantity != '') {
            quantity = nlu_quantity(req.body.quantity);
          } else {
            quantity = cocktails[cocktail_slug].default_volume;
          }
          Drink.create({
            type: cocktail_slug,
            quantity: quantity,
            sessionId: session.dataValues.id
          }).then(() => {
            res.json({
              "messages": []
            });
            res.status(200);
          })
        }
      })
    }
  })
})

app.post('/sam/fuel/get_drinks_resume', function(req, res) {
  console.log('-------- DRINKS-RESUME -------')
  res.setHeader('Content-Type', 'text/plain');
  User.findOne({where: {messengerId: req.body['messenger user id']}, }).then(user => {
    if (user == null) {
      res.json({
        "redirect_to_blocks": ["Welcome message"]
      });
      res.status(200);
    } else {
      Session.findOne({
        where: {userId: user.dataValues.id},
        order: [['createdAt', 'DESC']]
      }).then((session)=>{
        Drink.findAll({where: {sessionId: session.dataValues.id} }).then(drinks => {
          messages = []
          for (var i=0; i<drinks.length; i++) {
            var ingredients = cocktails[drinks[i].type].ingredients;
            var quantity = drinks[i].quantity;
            var stacked = 0;
            console.log(ingredients.length);
            for (var j=0; j<ingredients.length; j++) {
              console.log(alcohols[ingredients[j].name].types['default'].default_degree * 0.01 * quantity * ingredients[j].quantity * 0.8 /50)
              stacked += alcohols[ingredients[j].name].types['default'].default_degree * 0.01 * quantity * ingredients[j].quantity * 0.8 /50;
            }
            messages.push({'text': 'Un verre de '+ drinks[i].dataValues.quantity + 'mL de ' + cocktails[drinks[i].dataValues.type].name + ' (' + stacked +'g/L)'})
          }
          res.json({
            "messages": messages
          });
          res.status(200);
        })


      })
    }
  })
});

app.post('/sam/fuel/get_level_resume', function(req, res) {
  console.log('-------- LEVEL-RESUME -------')
  first_check(req, res, function(req, res, user){
    Session.findOne({
      where: {userId: user.dataValues.id},
      order: [['createdAt', 'DESC']]
    }).then((session)=>{
      Drink.findAll({
        include: [Alcohol],
        where: {sessionId: session.dataValues.id} })
      .then(drinks => {
        messages = []
        var date = new Date()
        var stacked = 0;
        var current = 0;
        drinks.push({createdAt: date});
        for (var i=0; i<drinks.length-1; i++) {
          var ingredients = cocktails[drinks[i].type].ingredients;
          var single = 0
          console.log(ingredients);
          var quantity = drinks[i].quantity;
          console.log(ingredients.length);
          for (var j=0; j<ingredients.length; j++) {
            console.log(alcohols[ingredients[j].name].types['default'].default_degree * 0.01 * quantity * ingredients[j].quantity * 0.8 /50)
            single += alcohols[ingredients[j].name].types['default'].default_degree * 0.01 * quantity * ingredients[j].quantity * 0.8 /50;
          }
          var laps = drinks[i].createdAt - drinks[i+1].createdAt;
          var decrease = laps*0.15/(3.6e6)
          if (decrease > single) {
            decrease = single;
          }
          stacked += single - decrease;
        }
        messages.push({'text': "cumul d'alcool de " + stacked +' g/L'});
        messages.push({'text': "taux approximatif actuel de " + current +' g/L'});
        res.json({
          "messages": messages
        });
        res.status(200);
      })
    })
  });
});

//// OLDOLDOLDOLDOLDOLDOLDOLDOLD


app.get('/', function(req, res) {
    res.render('tv.ejs');
});


var port_number = app.listen(process.env.PORT || 3000);
