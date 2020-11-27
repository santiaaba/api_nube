const WapaApi = require("./wapaApi.js")
const config = require('../config.js')

module.exports = {

show: function(req,res){
	const wapaApi= new WapaApi(config.wapa.api_url,config.wapa.api_port)
	wapaApi.call('/task/' + req.params.taskid,'GET',req.body)
	.then(data=>{
		res.send(data)
	})
	.catch(err=>{
		console.log(err)
		res.status(410).send('{"error":"Error contra la API de WAPA"}')
	})
}

}
