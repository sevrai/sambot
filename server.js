
var express = require('express');
var http = require('http');
var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('sambot.db');
var Sequelize = require('sequelize');

var request = require('request');
var app = express();
var bodyParser = require('body-parser')

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
    type: Sequelize.STRING,
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

User.sync({force: false}).then(() => {
  // Table created
  User.findAll().then(users => {
    console.log(users)
  });
});

Session.sync({force: false}).then(() => {
  // Table created
  Session.findAll().then(sessions => {
    console.log(sessions)
  });
});

Drink.sync({force: false}).then(() => {
  // Table created
  Drink.findAll().then(drinks => {
    console.log(drinks)
  });
});

/// POST/GET methods

app.post('/sam/fuel/new_user', function(req, res){
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
          Drink.create({
            type: req.body.alcohol_type,
            quantity: req.body.quantity,
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

app.post('/sam/fuel/get_resume', function(req, res) {
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
        console.log(session.get({plain: true}))
        Drink.findAll({where: {sessionId: session.dataValues.id} }).then(drinks => {
          console.log(drinks[0]);
          messages = []
          for (var i=0; i<drinks.length; i++) {
            messages.push({'text': 'Un verre de '+ drinks[i].dataValues.quantity + ' de ' + drinks[i].dataValues.type})
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

//// OLDOLDOLDOLDOLDOLDOLDOLDOLD

app.get('/new/:id/:name', function(req, res){
  res.setHeader('Content-Type', 'text/plain');
  res.status(200);
  db.all("SELECT * FROM users WHERE ID=?",req.params.id, function(err, rows){
    if (rows.length<=0) {
      db.run("INSERT into users (ID, name) VALUES ($id, $name)", {'$id':req.params.id, '$name':req.params.name.replace(/\+/gi)}, function(err){console.log(this)});
      res.json({
        "messages":[
          {'text': 'nouvel utilisateur créé'}
        ]
      });
    }
  });
})

app.get('/resume', function(req, res){
  res.setHeader('Content-Type', 'text/plain');
  res.status(200);
  db.all("SELECT * FROM users", function(err, users) {
    console.log(err, users, this);
    total = {};
    for (var i=0; i<users.length; i++) {
      total[users[i].ID] = {'nb':0, 'name':users[i].name};
      console.log(users[i]);
    }
    console.log(total);
    db.all("SELECT * FROM times", function(err, rows){
      console.log(err);
      for (row in rows) {
        if (rows[row].end != null) {
          var user_id = String(rows[row].user_id);
          if (total[user_id] != undefined) {
            total[user_id]['nb'] += rows[row].end - rows[row].start;
            console.log(total);
          }
        }
      }
      msg = []
      for (i in total) {
        console.log(i);
        msg.push({'text':total[i]['name']+' cumule '+total[i]['nb']+' secondes perdues'});
      }
      res.json({
        "set_attributes":
          {

          },
        "messages":msg
      });
      res.end();
      console.log('updated');
    })

  });
})

app.get('/stop/:id', function(req, res){
  db = new sqlite3.Database('sambot.db');
  var date = new Date();
  var time2 = date.getTime();
  var id = parseInt(req.params.id.replace(/\+/gi, " "));
  db.all("select * from times where user_id = ? order by ID desc limit 1 ",id, function(err, rows){
    time1 = parseInt(rows[0].start);
    db.run("update times set end = $value where ID = $id", {'$id':rows[0].ID, '$value':time2}, function(err){
      console.log(this, time1)
      res.setHeader('Content-Type', 'text/plain');
      res.status(200);
      var diff = (time2-time1)/1000;
        res.json({
         "messages": [
            {
              "attachment":{
                "type":"template",
                "payload":{
                  "template_type":"generic",
                  "elements":[
                    {
                      "title":"voyons ce score...",
                      "image_url":"",
                      "buttons":[
                        {
                          "set_attributes":
                          {
                            "diff": diff
                          },
                          "type": "show_block",
                          "block_name": "result",
                          "title": "resultat"
                        }]
                    }]
                }}
            }]
        });
        res.end();
        console.log('updated');
    })

  });
  db.close();
});

app.get('/start/:id', function(req, res){
  db = new sqlite3.Database('sambot.db');
  var date = new Date();
  var time = parseInt(date.getTime());
  var id = parseInt(req.params.id.replace(/\+/gi, " "));
  //insert new time with time1 :
  db.run("INSERT into \"times\" (user_id, start) VALUES ($id, $time)", {'$id':id, '$time':time}, function(err){
    res.setHeader('Content-Type', 'text/plain');
    console.log(this, err, time, id)
    res.status(200);
    res.json({
       "messages": [
          {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"generic",
                "elements":[
                  {
                    "title":"c'est parti !",
                    "image_url":"http://www.lepoint.fr/images/2012/05/02/debat-566573-jpg_388849_660x281.JPG",
                    "buttons":[
                      {
                        "set_attributes":
                        {
                          "time_id": this.lastID
                        },
                        "type": "show_block",
                        "block_name": "stop_block",
                        "title": "J'ai fini !"
                      }]
                  }]
              }}
          }]
      });
      res.end();
      console.log('updated');
  });
  db.close();

});

app.get('/', function(req, res) {
    res.render('tv.ejs');
});


var port_number = app.listen(process.env.PORT || 3000);
