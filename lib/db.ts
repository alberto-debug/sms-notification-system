import mysql from 'mysql2/promise'

declare global {
  var mysqlConnection: mysql.Connection | undefined
}

let connection: mysql.Connection | undefined

export async function getConnection(): Promise<mysql.Connection> {
  if (connection) {
    return connection
  }

  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'notification',
  }

  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to MySQL database:', config.database)
    return connection
  } catch (error) {
    console.error('Failed to connect to MySQL:', error)
    throw error
  }
}

export async function closeConnection() {
  if (connection) {
    await connection.end()
    connection = undefined
  }
}

export async function executeQuery(sql: string, values?: any[]) {
  const conn = await getConnection()
  try {
    const [results] = await conn.execute(sql, values)
    return results
  } catch (error) {
    console.error('Query execution error:', error)
    throw error
  }
}
