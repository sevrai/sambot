var Session = require('./session');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('drinks', {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'liquide'
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '4 cL'
    },
    sessionId: {
      type: DataTypes.INTEGER,
      references: {
        model: Session,
        key: 'id'
      },
      field: 'session_id'
    }
  })
}
