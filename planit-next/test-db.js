const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://mansikhamar14_db_user:<mansi123>@cluster0.euwgsw6.mongodb.net/planit?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to server");
  } catch(e) {
    console.error("Connection failed:", e.message);
  } finally {
    await client.close();
  }
}
run();
