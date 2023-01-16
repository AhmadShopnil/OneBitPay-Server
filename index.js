const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express()

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tus40xp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const userCollection = client.db('OneBitPay').collection('Users')
        const transactionCollection = client.db('OneBitPay').collection('Transactions')



        // save user info in database
        app.get('/addUser', async (req, res) => {

            // demo user creation
            // const user = {
            //     'name': 'Shopnil',
            //     'userEmail': 'shopnil@gmail.com',
            //     'phone': '454544',
            //     'balance': 20000,
            //     'address': 'Tangail'
            // }
            // const user = req.body

            const result = await userCollection.insertOne(user)
            if (result.acknowledged) {
                res.send({
                    status: true,
                    data: result
                })
            }
            else {
                res.send({
                    status: false
                })
            }
            console.log(result)
        })

        // get user  single info from database START
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { userEmail: email }
            const result = await userCollection.findOne(query)

            if (result) {
                res.send({
                    status: true,
                    data: result
                })
            }
            else {

            }

        })
        // get user  single info from database END


        // get transaction  info from database START

        // received history
        app.get('/transactionReceive/:email', async (req, res) => {
            const email = req.params.email;
            const query = { receiverEmail: email }
            const result = await transactionCollection.find(query).toArray()

            if (result) {
                res.send({
                    status: true,
                    data: result
                })
            }
            else {

            }

        })

        // Sending history
        app.get('/transactionSend/:email', async (req, res) => {
            const email = req.params.email;
            const query = { senderEmail: email }
            const result = await transactionCollection.find(query).toArray()

            if (result) {
                res.send({
                    status: true,
                    data: result
                })
            }
            else {

            }

        })

        // get transaction info from database END



        // transfer money START
        app.put('/sendMoney', async (req, res) => {
            // const sendMoneyInfo = req.body

            // demo senderinfo
            const sendMoneyInfo = {
                'senderEmail': 'shopnil@gmail.com',
                'receiverEmail': 'rakib@gmail.com',
                'amount': 1000
            }

            const { senderEmail, receiverEmail, amount } = sendMoneyInfo

            // Decrease amount receiver account
            const result1 = await userCollection.findOne({ userEmail: senderEmail })
            const senderBalance = result1.balance
            const senderNewBalance = senderBalance - amount
            const result2 = await userCollection.updateOne({ userEmail: senderEmail }, { $set: { balance: senderNewBalance } })

            // add amount receiver account
            const result3 = await userCollection.findOne({ userEmail: receiverEmail })
            const receiverBalance = result3.balance
            const receiverNewBalance = receiverBalance + amount
            const result4 = await userCollection.updateOne({ userEmail: receiverEmail }, { $set: { balance: receiverNewBalance } })

            const info = {
                senderEmail,
                receiverEmail,
                amount,
                transactionId: 456
            }

            const transactionInfo = await transactionCollection.insertOne(info)

            if (transactionInfo) {
                res.send({
                    status: true,
                    data: result4
                })
            }

        })
        // transfer money END





    }
    catch {

    }


}
run().catch(err => console.error(err))






app.get('/', async (req, res) => {
    res.send('OneBitPay Server is working ')
})

app.listen(port, () => {
    console.log((`OneBitPay is running on port : ${port}`))
})
