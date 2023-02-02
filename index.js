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
        const agentsRequests = client.db('OneBitPay').collection('agentsRequests');
        const blogsCollection = client.db('OneBitPay').collection('blogs'); const donationCollection = client.db('OneBitPay').collection('Donations');
        const cashInCollection = client.db('OneBitPay').collection('cashIn');



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


        // //get transaction  info from database START -----------------------
        // received history
        // app.get('/transactionReceive/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const query = { receiverEmail: email }
        //     const result = await transactionCollection.find(query).toArray()

        //     if (result) {
        //         res.send({
        //             status: true,
        //             data: result
        //         })
        //     }
        //     else {
        //         res.send({
        //             status: false,
        //         })
        //     }

        // })

        // Sending history
        app.get('/transactionSend/:email', async (req, res) => {
            const email = req.params.email;
            const query = {};
            const allresult = await transactionCollection.find(query).sort({ $natural: -1 }).toArray();
            const result = allresult.filter(relt => relt.senderEmail === email || relt.receiverEmail === email);

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

            const { senderEmail, receiverEmail, amount, time, type } = sendMoneyInfo

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
                time,
                transactionId: crypto.randomBytes(6).toString('hex').toUpperCase(),
                type

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
                date: userDetail.time,

            }

            clientMSG.messages
                .create({
                    body: `You received ${userDetail.balance} $ recharge form OneBitPay, Your transaction id is ${trxID}. For more info please visit https://one-bit-pay-server.vercel.app/`,
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
            console.log(recharge);
        });

        //Get Recharge Information by user email
        app.get('/recharge/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await rechargeCollection.find(query).sort({ $natural: -1 }).toArray();
            res.send(result);
        })


        //Inster agents requets data
        app.post('/agents/request', async (req, res) => {
            const agentInfo = req.body;
            const result = await agentsRequests.insertOne(agentInfo);
            res.send(result);
        })

        // One time update all datbase users data
        // app.get('/updateee/:email', async(req, res) => {
        //     const email = req.params.email;
        //     const query = {userEmail: email}
        //     const option = {upsert: true};
        //     const updatedDoc = {
        //         $set: {
        //             commission: 0,
        //         }
        //     }
        //     const result = await userCollection.updateMany(query, updatedDoc, option);
        //     res.send(result);
        // })

        app.put('/userUpdate/:email', async (req, res) => {
            const email = req.params.email;
            const updatedUserData = req.body;
            const query = {
                userEmail: email
            };
            const options = {
                upsert: true
            };
            const updatedDoc = {
                $set: {
                    name: updatedUserData.name,
                    address: updatedUserData.address,
                    imageUrl: updatedUserData.imageUrl,
                    nidNumber: updatedUserData.nidNumber,
                    phnNumber: updatedUserData.phnNumber,
                    birthDate: updatedUserData.birthDate,
                }
            };
            const result = await userCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })


        app.get('/blogs', async (req, res) => {
            const query = {}
            const result = await blogsCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await blogsCollection.findOne(query)
            res.send(result)
        })


        app.get('/donations', async (req, res) => {
            const query = {}
            const result = await donationCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/donations/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await donationCollection.findOne(query)
            res.send(result)
        })

        //Checking agents status
        app.get('/user/agent/:email', async(req, res) => {
            const email = req.params.email;
            const query = {userEmail: email};
            const user = await userCollection.findOne(query);
            res.send({isAgent: user.role === 'agent'});
          })

        //Checking Admin status
        app.get('/user/admin/:email', async(req, res) => {
            const email = req.params.email;
            const query = {userEmail: email};
            const user = await userCollection.findOne(query);
            res.send({isAdmin: user.role === 'admin'});
          })

        //Checking user status
        app.get('/user/normaluser/:email', async(req, res) => {
            const email = req.params.email;
            const query = {userEmail: email};
            const user = await userCollection.findOne(query);
            res.send({isUser: user.role === 'user'});
          })

          // Cash in from agent account to user account
          app.put('/agent/cashin', async (req, res) => {
            const data = req.body;
            const {receiverEmail, agentEmail, amount} = data;
            const commi = (parseInt(amount)/100) * 8;

            const user = await userCollection.findOne({userEmail: receiverEmail});
            const agent = await userCollection.findOne({userEmail: agentEmail});

            //Updationg agent balance and commission------------------
            const agentQuery = {userEmail: agentEmail};
            const Agentoption = {upsert: true};
            const AgentupdatedDoc = {
                $set: {
                    balance: parseInt(agent.balance) - parseInt(amount),
                    commission: parseFloat(parseFloat(agent.commission) + parseFloat(commi)).toFixed(2)
                }
            }
            const agentResult = await userCollection.updateOne(agentQuery, AgentupdatedDoc, Agentoption);


            //Updating user balance-----------------------
            const userQuery = {userEmail: receiverEmail};
            const userOption = {upsert: true};
            const userUpdatedDoc = {
                $set: {
                    balance: parseInt(user.balance) + parseInt(amount)
                }
            }
            const userResult = await userCollection.updateOne(userQuery, userUpdatedDoc, userOption);

            res.send({userResult, agentResult})
          })

          app.get('/get/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = {userEmail: email};
            const result = await userCollection.findOne(query);
            res.send(result);
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
