'use strict';
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { MongoClient } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcryptjs');

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      let a, b, url1, url2, respObj, url1Data, url2Data, liked, ip, ipSaved;
      ip = bcrypt.hashSync(req.socket.remoteAddress, bcrypt.genSaltSync(12));
      liked = req.query.like;

      if (typeof req.query.stock === 'object') {
        [a, b] = req.query.stock;
      } else {
        a = req.query.stock
      }

      (async () => {

        // get stock info for first symbol
        url1 = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/' + a + '/quote';
        await fetch(url1)
          .then((response) => response.json())
          .then((data) => {
            // prepare data of first symbol
            url1Data = {"stock": data.symbol, "price": data.latestPrice};
          })
          .catch((err) => console.error(err));
        
        // get stock info for second symbol
        if (b) {
          url2 = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/' + b + '/quote';
          await fetch(url2)
            .then((response) => response.json())
            .then((data) => {
              // prepare data of second symbol
              url2Data = {"stock": data.symbol, "price": data.latestPrice};
            })
            .catch((err) => console.error(err));
        } 

        a = a.toUpperCase();
        if (b) b = b.toUpperCase();

        // setup mongoDB
        const uri = process.env.DB;
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        let result1, result2, result3, ins1, ins2, ins3;
        const keyID = {
            "GOOG": '1',
            "MSFT": '2',
            "AAPL": '3'
          };

        try {
          // connect to DB
          await client.connect();
          
          if (liked == 'true') {
            // search for ip in DB
            ipSaved = false;
            await client.db("fcc_stock_exercise").collection("IP").find({}).forEach((el) => {
              let x = bcrypt.compareSync(req.socket.remoteAddress, el.IP);
              if (x) ipSaved = true;
            });
            if (!ipSaved) {
              // save IP in DB
              ins1 = await client.db("fcc_stock_exercise").collection("IP").insertOne({"IP": ip});
              
              // Liked symbol increase +1 
              ins2 = await client.db("fcc_stock_exercise").collection("likes").updateOne({id: keyID[a]}, {$inc: {[a]: 1}});

              if (b) {
                // Liked second symbol increase +1
                ins3 = await client.db("fcc_stock_exercise").collection("likes").updateOne({id: keyID[b]}, {$inc: {[b]: 1}});
              }
            }
          } 
          
          // find likes count for first symbol
          result2 = await client.db("fcc_stock_exercise").collection("likes").findOne({id: keyID[a]});

          // find likes count for second symbol
          if (b) result3 = await client.db("fcc_stock_exercise").collection("likes").findOne({id: keyID[b]});

          // add likes or rel_likes count to data
          if (b) {
            url1Data['rel_likes'] = result2[a] - result3[b];
            url2Data['rel_likes'] = result3[b] - result2[a];
          } else {
            url1Data["likes"] = result2[a];
          }

          // prepare the response object
          if (b) {
            respObj = {"stockData": [url1Data, url2Data]};
          } else {
            respObj = {"stockData": url1Data};
          }
          
        } catch(e) {
          console.error(e);
        } finally {
          await client.close();
        }

        res.json(respObj);
        
      })();

    });
    
};