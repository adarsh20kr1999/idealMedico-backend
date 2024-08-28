const express = require("express");
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', // Replace with your MySQL username
  password: process.env.DB_PASSWORD || 'Adarsh@123', // Replace with your MySQL password
  database: process.env.DB_NAME || 'idealmedicodb' // Replace with your MySQL database name
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

// API route to fetch data based on medicine name
app.get('/api/:name', (req, res) => {
  const nameArr = req.params.name.split(' ');
  const query = nameArr.join('_').toLowerCase();

  connection.query("SHOW TABLES", (err, tables) => {
    if (err) {
      console.error('Error fetching tables:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    const tableNames = tables.map(table => Object.values(table)[0].toLowerCase());
    const matchingTable = tableNames.find(table => table === query);

    if (matchingTable) {
      // If a matching table is found, fetch all data from the table
      connection.query(`SELECT * FROM ${matchingTable}`, (err, results) => {
        if (err) {
          console.error('Error fetching data from table:', err);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.json({ results });
      });
    } else {
      // If no exact match, search across all tables for the name
      let promises = tableNames.map(table => {
        return new Promise((resolve, reject) => {
          connection.query(`SELECT * FROM ${table} WHERE name LIKE ?`, [`%${req.params.name}%`], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
      });

      Promise.all(promises)
        .then(results => {
          const mergedResults = results.flat();
          if (mergedResults.length > 0) {
            console.log(mergedResults);
            res.json({ results: mergedResults });
          } else {
            res.json({ message: 'This medicine is not available' });
          }
        })
        .catch(err => {
          console.error('Error during search:', err);
          res.status(500).json({ message: 'Internal Server Error' });
        });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
