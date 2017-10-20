
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    firstName: {
      type: DataTypes.STRING
    },
    messengerId: {
      type: DataTypes.INTEGER
    }
  })
}
