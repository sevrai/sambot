var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sambot.db');
var Sequelize = require('sequelize');

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
sequelize
  .authenticate()
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
  },
  close: function(){
    console.log('foo');
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
// force: true will drop the table if it already exists
aa = User.sync({force: true}).then(() => {
  // Table created
  User.findAll().then(users => {
    console.log(users)
  })

  return User.create({
    firstName: 'John',
    messengerId: 123456789
  });
});
 aa.then(() =>{
   console.log('roe')
 })
