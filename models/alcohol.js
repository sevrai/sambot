
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('alcohols', {
    name: {
      type: DataTypes.STRING
    },
    degree: {
      type: DataTypes.FLOAT
    }
  })
}
