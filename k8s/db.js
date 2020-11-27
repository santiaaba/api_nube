/* Modulo para la conexion a la base de datos */
const mysql = require('mysql')
//const mysql = require('@mysql/xdevapi')

class Database {
	constructor(config){
		console.log(config)
		this.connection = mysql.createPool({
			connectionLimit: config.db.connectionLimit,
			host: config.db.host,
			user: config.db.user,
			database: config.db.database,
			password: config.db.pass
		})
	}
	query(sql){
		return new Promise((resolve,reject) => {
			this.connection.query(sql,(err,rows) => {
				if(err)
					return reject(err)
				resolve(rows)
			})
		})
	}
	close(){
		return new Promise((resolve,reject) => {
			this.connection.end(err => {
				if(err)
					return reject(err)
				resolve()
			})
		})
	}
}

module.exports = Database
