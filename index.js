const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const crypto = require('crypto');
const { toUnicode } = require('punycode');

const sid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const phone = process.env.PHONE_NUMBER

const clientMSG = require('twilio')(sid, authToken);

app.use(cors());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tus40xp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const userCollection = client.db('OneBitPay').collection('Users');
        const transactionCollection = client.db('OneBitPay').collection('Transactions');
        const rechargeCollection = client.db('OneBitPay').collection('rechargeCollection');



        // save user info in database
        app.post('/addUser', async (req, res) => {

            // demo user creation
            // const user = {
            //     'name': 'Shopnil',
            //     'userEmail': 'shopnil@gmail.com',
            //     'phone': '454544',
            //     'balance': 20000,
            //     'address': 'Tangail'
            // }

            const user = req.body
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

        })

        // get user  single info from database START
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
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
                res.send({
                    status: false,
                })
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
                res.send({
                    status: false,
                })
            }

        })

        // get transaction info from database END



        // transfer money START
        app.put('/sendMoney', async (req, res) => {
            const sendMoneyInfo = req.body
            // console.log(sendMoneyInfo)
            // demo senderinfo
            // const sendMoneyInfo = {
            //     'senderEmail': 'shopnil@gmail.com',
            //     'receiverEmail': 'rakib@gmail.com',
            //     'amount': 1000
            // }

            const { senderEmail, receiverEmail, amount } = sendMoneyInfo

            // Decrease amount receiver account
            const result1 = await userCollection.findOne({ userEmail: senderEmail })
            const senderBalance = result1.balance
            const senderNewBalance = parseInt(senderBalance) - parseInt(amount)
            const result2 = await userCollection.updateOne({ userEmail: senderEmail }, { $set: { balance: senderNewBalance } });

            // add amount receiver account
            const result3 = await userCollection.findOne({ userEmail: receiverEmail })
            const receiverBalance = result3.balance
            const receiverNewBalance = parseInt(receiverBalance) + parseInt(amount)
            const result4 = await userCollection.updateOne({ userEmail: receiverEmail }, { $set: { balance: receiverNewBalance } })

            const info = {
                senderEmail,
                receiverEmail,
                amount,
                transactionId: parseInt(Math.random() * 10000000000)

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

        // update user info
        app.put('updateInfo/:id', async (req, res) => {

            const id = req.params.id
            const updatedInfo = req.body;
            const { } = updatedInfo

            const result = await userCollection.updateOne({ _id: ObjectId(id) }, { $set: {} })

            if (result.modifiedCount) {
                res.send({
                    status: true
                })
            }

        });

        // Mobile Recharge by shamim-s
        app.post('/mobile/recharge', async (req, res) => {
            const userDetail = req.body;
            const trxID = crypto.randomBytes(6).toString('hex').toUpperCase();
            const recharge = {
                userphone: userDetail.phone,
                balance: userDetail.balance,
                userEmail: userDetail.userEmail,
                trxID,

            }

            clientMSG.messages
                .create({
                    body: "You have receivedrecharge form OneBitPay. YourTransaction ID is" + `${trxID}`,
                    from: "+18782058284",
                    to: "+8801717547898",
                })
                .then(message => console.log(message.sid));

            //minus user balance after recharge
            const result1 = await userCollection.findOne({ userEmail: userDetail.userEmail })
            const senderNewBalance = parseInt(result1.balance) - parseInt(userDetail.balance)
            const result2 = await userCollection.updateOne({ userEmail: userDetail.userEmail }, { $set: { balance: senderNewBalance } });

            const result = await rechargeCollection.insertOne(recharge);
            res.send(recharge);
            // console.log(recharge);
        })



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
