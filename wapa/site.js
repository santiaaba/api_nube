const WapaApi = require("./wapaApi.js")
const config = require('../config.js')

module.exports = {

nuevo: function(req,res){
	const wapaApi= new WapaApi(config.wapa.api_url,config.wapa.api_port)
	wapaApi.call('/namespace/' + req.params.namespaceID + '/site/','POST',req.body)
	.then(data=>{
		res.send(data)
	})
	.catch(err=>{
		res.status(410).send('{"error":"Error contra la API de WAPA"}')
	})
},

list: function(req,res){
	const wapaApi= new WapaApi(config.wapa.api_url,config.wapa.api_port)
	wapaApi.call('/namespace/' + req.params.namespaceID + '/site/','GET',null)
	.then(data=>{
		res.send(data)
	})
	.catch(err=>{
		res.status(410).send('{"error":"Error contra la API de WAPA"}')
	})
},

show: function(req,res){
	const wapaApi= new WapaApi(config.wapa.api_url,config.wapa.api_port)
	wapaApi.call('/namespace/' + req.params.namespaceID + '/site/' + req.params.siteID,'GET',null)
	.then(data=>{
		res.send(data)
	})
	.catch(err=>{
		res.status(410).send('{"error":"Error contra la API de WAPA"}')
	})

},

drop: function(req,res){
	console.log("Implementar")
},

update: function(req,res){
	console.log("Implementar")
}

}
