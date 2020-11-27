const express = require('express')
const bodyParser = require("body-parser")
const cors = require('cors')
const config = require('../config.js')
const Database = require('./db.js')
const api_namespace = require('./namespace.js')
const api_site = require('./site.js')
const api_task = require('./task.js')


const app = express()
const port = 3001

/*****************************
 *      Main
 *****************************/

db = new Database
users = new Array
var path = ''

app.use(bodyParser.json())
app.use(cors())

/* Task */
path = "/v1/appweb/task"
app.get(path + "/:taskid", function(req,res){api_task.show(req,res)})

/* Namespace */
path = "/v1/appweb/namespace"
app.get(path, function(req,res){api_namespace.list(req,res)})
app.get(path + "/:namespaceID", function(req,res){api_namespace.show(req,res)})
app.post(path + "/:namespaceID", function(req,res){api_namespace.create(req,res)})
app.put(path + "/:namespaceID", function(req,res){api_namespace.update(req,res)})
app.delete(path + "/:namespaceID", function(req,res){api_namespace.delete(req,res)})

/* Sites */
path = "/v1/appweb/namespace/:namespaceID/site"
app.get(path, function(req,res){api_site.list(req,res)})
app.get(path + "/:siteID", function(req,res){api_site.show(req,res)})
app.post(path + "/:siteID", function(req,res){api_site.create(req,res)})
app.put(path + "/:siteID", function(req,res){api_site.update(req,res)})
app.delete(path + "/:siteID", function(req,res){api_site.delete(req,res)})

/***********************************/
app.listen(port,function(){
	console.log("Nose server running on http://10.40.12.100:" + port)
	console.log('CORS-enabled')
})
