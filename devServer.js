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
// schema definition
var templateSchema = mongoose.Schema({
      formName:String,
      json:String
    });

var formTemplate = mongoose.model("formTemplates", templateSchema, "formTemplates");

var formSchema  = mongoose.Schema({
      label:String,
      fieldSchema:Object,
      uiSchema:Object
    });
var formSchemaModel = mongoose.model("formSchema", formSchema, "formSchema");
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
@API: /api/template/list
*/
app.get("/api/template/list", function(req, res){
  var result = formSchemaModel.find().select("_id, label").exec();
  var rs = result.then(function(rows){
    var list = rows.map(function(row){
      return {name:row.label, id:row._id};
    });
    return list;
  }).then(function(list){
    res.status(200).json(list);
  });
});
/*
@API: /api/template/migrate
*/
app.get("/api/template/migrate", function(req, res){
  formSchemaModel.remove({}, function(){
    console.log("Data cleanup on formSchema done");
  });
  var result = formTemplate.find().exec();

  var rs = result.then(function(rows){
    var list = rows.map(function(row){
      return {name:row.formName, json:row.json, text:row.text};
    });
    //list.each(function);
    return list;
  }).then(function(list){
    var templateList = [];
    list.forEach(function(row){
      var template = {};
      var json = false;
      // build schema data if old data exists
      if(row.json != ''){
        var json = JSON.parse(row.json);
        let tmp = [];
        var fields = Object.values(json).map(function(pos){
          pos.forEach(function(f){
            tmp.push(f);
          });
          return pos;
        });

        //fields = (fields.length > 1)?[].contact(...fields):fields[0];
        fields = tmp;
        var schema = {}, uiSchema = {}, formData = {};
        schema.title = row.name;
        schema.description = row.text;
        schema.type = "object";
        schema.required = [];
        schema.properties = {};
        // building schema format of fields
        fields.forEach(function(row){
          field = Object.values(row).pop();
          let fieldType;
          let  fieldProperties = {type:"string", title:field.label};
          switch (field['data-type']) {
            case 'textarea':
                uiSchema[field.id] = {"ui:widget": "text"};
              break;
              case 'date':
                  uiSchema[field.id] = {"ui:widget": "datetime"};
                  fieldProperties.format = "datetime";
                break;
                case 'select':
                    uiSchema[field.id] = {"ui:widget": "select"};
                    fieldProperties.enum = fieldProperties.enumNames = (typeof field.options == 'object')?field.options.choices:[];
                  break;
                case 'number':
                    fieldType = "number";
                  break;
            default:
              fieldType = "string";
          } // end switch

          //schema.properties = Object.defineProperty(schema.properties, id, {value:{type:fieldType, title:label } });
          schema.properties[field.id] = fieldProperties;
          if(field.required != 'false'){
            schema.required.push(field.id);
            schema.formData[field.id] = field.tooltip;
          }
        }); // end foreach
        template = { fieldSchema:schema, uiSchema:uiSchema };
      } //end if json data not exist
      template.label = row.name;
      // save form in DB
      let form = new formSchemaModel(template);
      form.save(function(err, obj){
        if (err) return console.error(err);
      });

      templateList.push(template);
    });
    res.status(200).json(templateList);
  });

});
/*
@API: POST /api/template/id
*/
app.post("/api/template/:id", function(req, res){
  var newData = { fieldSchema:req.body.fieldSchema, uiSchema:req.body.uiSchema, label:req.body.fieldSchema.title }; //req.body.params;req.body

  //res.status(200).json(newData);

  var result = formSchemaModel.findOneAndUpdate({_id:req.params.id}, newData, {upsert:true}).exec();
  result.then(function(row){
    res.status(200).json("succesfully saved");
  });

});
/*
@API: GET /api/template/id
*/
app.get("/api/template/:id", function(req, res){

  var result = formSchemaModel.findOne({_id:req.params.id}).exec();

  var rs = result.then(function(row){
    console.log("row", row);
    let template = { schema:row.fieldSchema || {title:row.label, type: "object",properties:{}}, uiSchema:row.uiSchema || {}, formData:{} };

    res.status(200).json(template);
  });

});
/*
@API: GET /api/test/id
*/
app.get("/api/test/:id", function(req, res){

  var result = formTemplate.findOne({_id:req.params.id}).exec();

  var rs = result.then(function(row){
    console.log("row", row);
    //res.status(200).json(row.json);
      var template = {};
      var json = {};
      if(row.json != ''){
        var json = JSON.parse(row.json);
        let tmp = [];
        var fields = Object.values(json).map(function(pos){
          pos.forEach(function(f){
            tmp.push(f);
          });
          return pos;
        });

        //fields = (fields.length > 1)?[].contact(...fields):fields[0];
        fields = tmp;
        var schema = {}, uiSchema = {}, formData = {};
        schema.title = row.formName;
        schema.description = row.text;
        schema.type = "object";
        schema.required = [];
        schema.properties = {};
        // building schema format of fields
        fields.forEach(function(row){
          field = Object.values(row).pop();
          let fieldType;
          let  fieldProperties = {type:"string", title:field.label};
          switch (field['data-type']) {
            case 'textarea':
                uiSchema[field.id] = {"ui:widget": "text"};
              break;
              case 'date':
                  uiSchema[field.id] = {"ui:widget": "datetime"};
                  fieldProperties.format = "datetime";
                break;
                case 'select':
                    uiSchema[field.id] = {"ui:widget": "select"};
                    fieldProperties.enum = fieldProperties.enumNames = (typeof field.options == 'object')?field.options.choices:[];
                  break;
                case 'number':
                    fieldType = "number";
                  break;
            default:
              fieldType = "string";
          } // end switch

          //schema.properties = Object.defineProperty(schema.properties, id, {value:{type:fieldType, title:label } });
          schema.properties[field.id] = fieldProperties;
          if(field.required != 'false'){
            schema.required.push(field.id);
            schema.formData[field.id] = field.tooltip;
          }
        }); // end foreach
        template = { schema:schema, uiSchema:uiSchema, formData:{} };
        json = template;
      }
    res.status(200).json(json);
  });

});
app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Listening at http://${server}`);
});
