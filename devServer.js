const path = require("path");
const express = require("express");
const webpack = require("webpack");

var mongoose = require('mongoose');

const server = process.env.RJSF_DEV_SERVER || "localhost:8888";
const splitServer = server.split(":");
const host = splitServer[0];
const port = splitServer[1];
const env = "dev";

const webpackConfig = require("./webpack.config." + env);
const compiler = webpack(webpackConfig);
const app = express();

//var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://dev:dev123@localhost/fv';
mongoose.connect(url, function(err){
  console.log("database:", err);
});

app.use(require("webpack-dev-middleware")(compiler, {
  publicPath: webpackConfig.output.publicPath,
  noInfo: true
}));

app.use(require("webpack-hot-middleware")(compiler));

app.get("/favicon.ico", function(req, res) {
  res.status(204).end();
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "playground", "index.html"));
});

app.get("/api/template_list", function(req, res){
  var list;
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("formTemplates").find({}).toArray(function(err, result) {
      if (err) throw err;
      //console.log(result);
      //list = result;
      //console.log('list', list.length);
      db.close();

      //console.log('list', list);
      res.status(200).end("result");

    });
  });
    res.status(200).end("result");
});

app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Listening at http://${server}`);
});
