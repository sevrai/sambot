yml = require('node-yaml')

var cocktails = yml.readSync('cocktails.yaml');
console.log(cocktails);
// console.log(data.alcohols.type)
// console.log(cocktails.gin_tonic.variants)
// console.log(cocktails.gin_tonic.ingredients)
