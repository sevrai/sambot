var User = require('./user');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sessions', {
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id'
      },
      field: 'user_id'
    }
  })
}
