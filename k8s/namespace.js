const K8sApi = require("./k8s_api.js")
const metricsApi = require("./prometheus.js")
const valid_name = /^[a-z][a-z0-9]+$/
const config = require('../config.js')

module.exports = {

nuevo: function(req,res){

	var inserId=0
	var k8s_api = new K8sApi(config.k8s.api_url,config.k8s.api_port)
	var promise

	/* Verificaciones previas */
	/* validez de datos */
	console.log("Revisando: " + req.body.name)
	if(! valid_name.test(req.body.name)){
		res.status(410).send('{"error":"Parametros incorrectos"}')
		return
	}
	var userid = userByToken(req.header('token'))
	if(userid){
		sql = 'insert into namespace(user_id,name) values (' +
			  userid + ',"' + req.body.name + '")'
		console.log(sql)
		promise = db.query(sql)
	} else {
		promise = new Promise((resolv,reject)=>{
			res.status(410).send('{"error":"Usuario inexistente"}')
		})
	}
	/* Creamos Namespace en K8S */
	promise
	.then( rows => {
		insertId = rows.insertId
		console.log("ID generado =" + insertId)
		var diccionario = new Array
		diccionario.push({'regex':'_namespace_name_','value':req.body.name})
		/* Creamos el namespace */
		return k8s_api.call('/api/v1/namespaces','POST','alta_namespace.yaml',diccionario)
	})
	.then( ok => {
		console.log("Namespace dado de ALTAAA!!")
		var url = '/apis/networking.k8s.io/v1/namespaces/' + req.body.name + '/networkpolicies'
		var diccionario = new Array
		diccionario.push({'regex':'_namespace_name_','value':req.body.name})
		return k8s_api.call(url,'POST','default_networkpolicy.yaml',diccionario)
	})
	.then( ok => {
		console.log("NetworkPolicy dada de alta!!")
		res.send("Namespace dado de alta")
	})
	.catch(err => {
		console.log(err)
		/* FALLA alta namespace en base de datos */
		if(typeof(err.code) != 'undefined'){
			errorDB(err,res)
		} else {
			/* Fallo algo en el alta en K8s */
			console.log("Fallo alta namespace o NetworkPolicy en K8s")
			sql = 'delete from namespace where id = ' + insertId 
			console.log(sql)
			db.query(sql)
			.then(rows => {
				console.log("Namespace eliminado")
			},err => {
				console.log("DB ERROR al querer eliminar el namespace")
			})
			/* Si lo que fallo es el alta del NetworkPolicy... entonces debemos
			   eliminar el namespace en k8s */
			if(0){  // No esta definido porque no entendemos el posible dato dentro de err
				console.log("Fallo alta NetworkPolicy en K8s")
				//var k8s_api = new K8sApi(config.k8s_api_url,config.k8s_api_port)
				k8s_api.call('/api/v1/namespaces/' + req.body.name,'DELETE','none.yaml',{})
				.then(ok=>{
					sql = 'delete from namespace where id = "' + insertId + '"'
					console.log(sql)
					db.query(sql)
				})
				.catch(err=>{
					console.log(err)
				})
			}
			res.status(500).send('{"error":"No se pudo crear el namespace en K8S"}')
		}
	})
},

list: function(req,res){
	/* Listado de namespaces del usuario */
	return new Promise((resolv,reject) => {
		var idUser = 0
		var i = 0
		console.log("-------usuarios-------")
		console.log(users)
		console.log("----------------------")
		while(idUser == 0 && i < users.length){
			if(req.headers['token'] == users[i].token){
				idUser = users[i].id
			}
			i++
		}
		if (!idUser)
			reject({code:300,message:"Token Incorrecto"})
		resolv(idUser)

	})
	.then(idUser=>{
		console.log("El userid = " + idUser)
		sql = 'select id,name from namespace where user_id =' + idUser
		console.log(sql)
		return db.query(sql)
	},err=>{
		console.log(err)
		res.status(300).send("Usuario incorrecto")
	})
	.then( rows => {
		res.send(JSON.stringify(rows))
	})
	.catch( err => {
		console.log(err)
		errorDB(err,res)
	})
},

show: function(req,res){
	/* Retorna la información de un namespace en particular. Obtenemos
	   de la API de k8s el namespace y le agregamos algunos datos de
	   sumarizacion */
	var datos
	var namespace_name
	var k8s_api = new K8sApi(config.k8s.api_url,config.k8s.api_port)

	module.exports.checkUserNamespace(req)
	.then(ok =>{
		return module.exports.namespaceNameById(req.params.namespaceid)
	}, err => {
		console.log(err)
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.message)
		})
	})
	.then(name =>{
		namespace_name = name
		console.log("Consultando API de K8s")
		return k8s_api.call('/api/v1/namespaces/' + name,'GET','none.yaml',{})
	}, err => {
		console.log(err)
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.body)
		})
	})

	.then( ok => {
		datos = ok.message
		datos.summary = {}
		/* Consultamos ahora por los deployment existentes */
		return k8s_api.call('/apis/apps/v1/namespaces/' + namespace_name +
							'/deployments','GET','none.yaml',{})
	})
	.then( ok => {
		datos.summary.deployments = ok.message.items.length
		/* Consultamos ahora por los servicios existentes */
		return k8s_api.call('/api/v1/namespaces/' + namespace_name +
							'/services','GET','none.yaml',{})
		res.status(ok.status).send(datos)
	})
	.then( ok => {
		datos.summary.services = ok.message.items.length
		/* Consultamos ahora por los volumenes */
		return k8s_api.call('/api/v1/namespaces/' + namespace_name +
							'/persistentvolumeclaims','GET','none.yaml',{})
	})
	.then( ok => {
		datos.summary.pvcs = ok.message.items.length
		res.status(ok.status).send(datos)
	})
	.catch( err => {
		console.log(err)
		res.status(err.status).send(err.message)
	})
},

drop: function(req,res){
	/* OJO... lo correcto sería enviar a eliminar el
	 * namespace y cuando k8s confirma su eliminacion,
	 * eliminarlo de la base de datos. */

	/* Elimina un namespace */
	var k8s_api = new K8sApi(config.k8s.api_url,config.k8s.api_port)

	module.exports.checkUserNamespace(req)
	.then(ok =>{
		console.log("Buscando nombre")
		return module.exports.namespaceNameById(req.params.namespaceid)
	}, err => {
		console.log("Error usernamespace")
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.message)
		})
	})
	.then(name =>{
		console.log("Enviando consulta a api K8S")
		return k8s_api.call('/api/v1/namespaces/' + name,'DELETE','none.yaml',{})
	}, err => {
		console.log(err)
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.message)
		})
	})
	.then(ok =>{
		sql="delete from namespace where id = " + req.params.namespaceid
		console.log(sql)
		return db.query(sql)
	},err=>{
		return new Promise((resolv,reject) => {
			res.status(500).send('{"error":"Base de datos no responde"}')
		})
	})
	.then(rows => {
		res.send("Namespace eliminado")
	})
	.catch(err => {
		res.status(500).send('{"error":"Namespace pudo eliminarse de kubernetes pero no de la base de datos."}')
	})
},

checkUserNamespace: function(req){
	/* Verifica que usuario y namespace existan.
	 * Toma el token del header y por el mismo busca
	 * en la base de datos al usuario. Luego, verifica
	 * que el namespace pasado en la url como parametro
	 * pertenezca al usuario */
	return new Promise((resolv,reject) => {
		var idUser = 0
		var i = 0
		while(idUser == 0 && i < users.length){
			if(req.headers['token'] == users[i].token){
				idUser = users[i].id
			}
			i++
		}
		if (!idUser){
			reject({code:300,message:"Token Incorrecto"})
		}
		sql = 'select name from namespace where id =' + req.params.namespaceid
			  ' and user_id = ' + idUser
		console.log(sql)
		db.query(sql)
		.then(rows => {
			if(rows.length == 1){
				resolv()
			} else {
				reject({code:402,message:"Namespace no existe o no pertenece al usuario"})
			}
		}, err => {
			console.log(err)
			reject({code:500,message:"Id de Namespace ingresado incorrecto"})
		})
	})
},

namespaceNameById: function(idNamespace){
	return new Promise((resolv,reject) => {
		sql = "select name from namespace where id = " + idNamespace
		console.log(sql)
		db.query(sql)
		.then(rows =>{
			if(rows.length == 1){
				resolv(rows[0].name)
			} else {
				reject({code:402,message:"Namespace no existe"})
			}
		}, err =>{
			reject({code:500,message:"Error en abse de datos"})
		})
	})
},

metrics_mem_all: function(req,res){
	/* Retorna las metricas de uso de ram entre todos los namespaces*/

	var metrics_api = new metricsApi(config.k8s.metrics_api_url,config.k8s.metrics_api_port)
	console.log("Metrics all")

	var a = new Promise((resolv,reject) => {
		var idUser = 0
		var i = 0
		console.log("-------usuarios-------")
		console.log(users)
		console.log("----------------------")
		while(idUser == 0 && i < users.length){
			if(req.headers['token'] == users[i].token){
				idUser = users[i].id
			}
			i++
		}
		if (!idUser)
			reject({code:300,message:"Token Incorrecto"})
		resolv(idUser)
	})
	a.then(userID => {
		sql = 'select id,name from namespace where user_id =' + userID
		console.log(sql)
		return db.query(sql)
	})
	.then(data=>{
		console.log(data)
		var namespaces=''
		data.forEach(function(v){
			namespaces += v.name + '|'
		})
		console.log(namespaces)
		if(namespaces.length > 1)
			namespaces = namespaces.slice(0, -1)
		console.log("Consultando API de metrics para: '" + namespaces +"'")
		var query = 'container_memory_usage_bytes{namespace=~"' + namespaces + '"}'
		return metrics_api.call(query,req.query.start,req.query.end,60)
	})
	.then(data => {
		console.log(data)
		res.send(data)
	})
	.catch(err => {
		console.log(err)
		res.status(410).send('Error')
	})
},

metrics_cpu_all: function(req,res){
	/* Retorna las metricas de uso de cpu entre todos los namespaces*/

	var metrics_api = new metricsApi(config.k8s.metrics_api_url,config.k8s.metrics_api_port)
	console.log("Metrics all")

	var a = new Promise((resolv,reject) => {
		var idUser = 0
		var i = 0
		console.log("-------usuarios-------")
		console.log(users)
		console.log("----------------------")
		while(idUser == 0 && i < users.length){
			if(req.headers['token'] == users[i].token){
				idUser = users[i].id
			}
			i++
		}
		if (!idUser)
			reject({code:300,message:"Token Incorrecto"})
		resolv(idUser)
	})
	a.then(userID => {
		sql = 'select id,name from namespace where user_id =' + userID
		console.log(sql)
		return db.query(sql)
	})
	.then(data=>{
		console.log(data)
		var namespaces=''
		data.forEach(function(v){
			namespaces += v.name + '|'
		})
		console.log(namespaces)
		if(namespaces.length > 1)
			namespaces = namespaces.slice(0, -1)
		console.log("Consultando API de metrics para: '" + namespaces +"'")
		var query = 'sum(rate(container_cpu_user_seconds_total{namespace=~"' + namespaces + '"}[' + req.query.step + ']))'
		return metrics_api.call(query,req.query.start,req.query.end,60)
	})
	.then(data => {
		console.log(data)
		res.send(data)
	})
	.catch(err => {
		console.log(err)
		res.status(410).send('Error')
	})
},

metrics_cpu: function(req,res){
	/* Retorna metricas de uso de cpu de un namespace */

	var metrics_api = new metricsApi(config.k8s.metrics_api_url,config.k8s.metrics_api_port)

	module.exports.checkUserNamespace(req)
	.then(ok =>{
		return module.exports.namespaceNameById(req.params.namespaceid)
	}, err => {
		console.log(err)
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.message)
		})
	})
	.then(name =>{
		console.log("Consultando API de metrics")
		var query = 'sum(rate(container_cpu_user_seconds_total{namespace="' + name + '"}[5m]))'
		return metrics_api.call(query,req.query.start,req.query.end,60)
	}, err => {
		console.log(err)
		return new Promise((resolv,reject) => {
			res.status(err.code).send(err.body)
		})
	})
	.then(data => {
		res.send(data)
	})
	.catch(err => {
		res.status(410).send('Error')
	})
}

} /* Fin del modulo */

function userByToken(token){
	/* Dato el token, retorna el id del usuario
	 * retorna 0 si no existe */
	var idUser = 0
	var i = 0
	while(idUser == 0 && i < users.length){
		if(token == users[i].token){
			idUser = users[i].id
		}
		i++
	}
	return idUser
}

function errorDB(err,res){
	console.log(err)
	switch(err.code){
		case 'ER_DUP_ENTRY':
			console.log("NAMESPACE DUPLICADO")
			res.status(401).send('{"error":"Ya existe el namespace segun la base de datos"}')
			break
		default :
			console.log("BASE NO RESPONDE")
			res.status(500).send('{"error":"Base de datos no responde"}')
	}
}
