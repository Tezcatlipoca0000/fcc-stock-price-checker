'use strict';

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      console.log('the queries >>> ', req.query);
      let stockSymbol = req.query.stock;
      let liked = req.query.like;
      console.log('the stock symbol >>>> ', stockSymbol);
      console.log('liked?? ', liked);
      console.log('typeof stockSymbol', typeof stockSymbol);
      if (typeof stockSymbol === 'object') var [a, b] = stockSymbol;
      console.log('destructured symbols ', a, b);
    });
    
};
