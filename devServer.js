const path = require("path");
const express = require("express");
const webpack = require("webpack");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const server = process.env.RJSF_DEV_SERVER || "localhost:8888";
const splitServer = server.split(":");
const host = splitServer[0];
const port = splitServer[1];
const env = "dev";

const webpackConfig = require("./webpack.config." + env);
const compiler = webpack(webpackConfig);
const app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true}));
// database connection initialization
var url = 'mongodb://dev:dev123@localhost/fv';
mongoose.connect(url);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function(){
  // we are connected
});

var templateSchema = mongoose.Schema({
  formName:String,
  json:String
});

var formTemplate = mongoose.model("formTemplates", templateSchema, "formTemplates");

///////////// db //////////////

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
/*
@API: /api/template_list
*/
app.get("/api/template_list", function(req, res){

  var result = formTemplate.find().limit(100).exec();

  var rs = result.then(function(rows){
    var list = rows.map(function(row){
      return {name:row.formName, json:row.json};
    });
    //list.each(function);
    return list;
  }).then(function(list){
    var templateList = [];
    list.forEach(function(row){
      if(row.json != ''){
        var json = JSON.parse(row.json);
        var schema = {
          title:row.name,
          description: "",
          type: "object",
          required: [
          ],
          properties: {
            "firstName": {
              "type": "string",
              "title": "First name"
            }
          }
        };
        var uiSchema = {
            "firstName": {
              "ui:autofocus": true,
              "ui:emptyValue": ""
            }
          };
        var formData = {"firstName": "Chuck"};
        templateList.push({ schema:schema, uiSchema:uiSchema, formData:{} });
      }

    });
    res.status(200).json(templateList);
  });

});
/*
@API: /api/template_migrate
*/
app.get("/api/template_migrate", function(req, res){

  var result = formTemplate.find().exec();
  console.log(result);
  var rs = result.then(function(rows){
    var list = rows.map(function(row){
      var json = JSON.parse(row.json);
      return {name:row.formName, json:row.json};
    });
    return list;
  }).then(function(list){

    res.status(200).json(list);
  });

});


app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Listening at http://${server}`);
});
