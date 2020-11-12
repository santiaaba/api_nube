class WapaApi {
	constructor(host,port){
		this.host = host
        this.port = port
	}

	call(path,method,data){
		console.log(data)
		var host = this.host
        var port = this.port
		console.log(method + " URL:" + host + ':' + port + '/' + path)
		return new Promise((resolve,reject) => {
			var datos=''
			const options = {
				hostname: host,
				port: port,
				path: path,
				method: method,
				rejectUnauthorized: false,
				requestCert: false,
				agent: false,
				headers: {
					'Content-Type': 'application/json',
					//'Content-Length': data.length
				}
			}
			console.log("Aca estamos")
			const http = require("http")
			const req = http.request(options)
			req.on('response',function(res){
				console.log("statusCode: " + res.statusCode)
				res.on('data', d => {
					datos = datos + d
				})
				res.on('end',function(){
					console.log("llegamos al end")
					if(res.statusCode >= 200 && res.statusCode <= 299){
						console.log("Es un OK: " + datos)
						resolve({status:res.statusCode,message:JSON.parse(datos)})
					} else {
						console.log("Es un ROLLBACK")
						console.log(datos)
						reject({status:res.statusCode,message:JSON.parse(datos)})
					}
				})
			})
			req.on('error', error => {
				console.log("ERRRROOOOOR:")
				console.log(error)
				reject({status:500,message:'{"error":"Error interno"}'})
			})
			if(method == 'POST' || method == 'PUT'){
				req.write(data)
			}
			req.on('end',() => {
				console.log("Terminamos de recibir datos")
			})
			req.end()
		})
	}
}

module.exports = WapaApi
