'use strict';
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { MongoClient } = require('mongodb');
require('dotenv').config();



module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      let a, b, url1, url2, respObj, url1Data, url2Data, liked;

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
        b = b.toUpperCase();

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
            result1 = await client.db("fcc_stock_exercise").collection("IP").findOne({"IP": req.socket.remoteAddress});
            //console.log('user IP found in db?? >> ', result1);
            if (!result1) {
              // save IP in DB
              ins1 = await client.db("fcc_stock_exercise").collection("IP").insertOne({"IP": req.socket.remoteAddress});
              //console.log('not IP found, IP inserted >>> ', ins1);
              
              // Liked symbol increase +1 
              ins2 = await client.db("fcc_stock_exercise").collection("likes").updateOne({id: keyID[a]}, {$inc: {[a]: 1}});
              //console.log('liked increased >>> ', ins2);
              if (b) {
                // Liked second symbol increase +1
                ins3 = await client.db("fcc_stock_exercise").collection("likes").updateOne({id: keyID[b]}, {$inc: {[b]: 1}});
                //console.log('liked increased 2 >>>> ', ins3);
              }
            }
          } 
          
          // find likes count for first symbol
          result2 = await client.db("fcc_stock_exercise").collection("likes").findOne({id: keyID[a]});

          // find likes count for second symbol
          if (b) result3 = await client.db("fcc_stock_exercise").collection("likes").findOne({id: keyID[b]});

          //console.log('the likes on 1 >>>> ', result2);
          //console.log('the likes on 2 >>> ', result3);

          // add likes count to data of first symbol
          url1Data["likes"] = result2[a];
          // add likes count to data of second symbol
          if (b) url2Data["likes"] = result3[b];

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

// TODO: 
// 1) change likes for rel_likes if (b)
// 2) anonymize IP 