const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const crypto = require('crypto');
const { toUnicode } = require('punycode');
const { Console } = require('console');

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
        const agentsRequestsCollection = client.db('OneBitPay').collection('agentsRequests');
        const blogsCollection = client.db('OneBitPay').collection('blogs'); const donationCollection = client.db('OneBitPay').collection('Donations');
        const cashInCollection = client.db('OneBitPay').collection('cashIn');
        const loanApplicantsCollection = client.db("OneBitPay").collection("loanAPPlicants");
        const billCategoryCollection = client.db("OneBitPay").collection("billCategory");
        const allCompaniesCollection = client.db("OneBitPay").collection("allCompanies");
        const faqCollection = client.db("OneBitPay").collection("faq")


        // save user info in database
        app.post('/addUser', async (req, res) => {
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
            const result4 = await userCollection.updateOne({ userEmail: receiverEmail }, { $set: { balance: receiverNewBalance, notification: true } })

            const info = {
                senderEmail,
                receiverEmail,
                amount,
                time,
                transactionId: crypto.randomBytes(6).toString('hex').toUpperCase(),
                type,
                notification: true

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
            const result = await agentsRequestsCollection.insertOne(agentInfo);
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

        app.put('/userUpdate', async (req, res) => {
            const updatedUserData = req.body;
            const { name, address, userEmail, imageUrl, nidNumber, phnNumber, birthDate } = updatedUserData
            const query = {
                userEmail: updatedUserData?.userEmail
            };
            const options = {
                upsert: true
            };
            const updatedDoc = {
                $set: {
                    name,
                    address,
                    imageUrl,
                    nidNumber,
                    phnNumber,
                    birthDate
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
        app.get('/notification/:email', async (req, res) => {
            const email = req.params.email;
            // const query = { userEmail: email }
            const result = await userCollection.updateOne({ userEmail: email }, { $set: { notification: false } })

            if (result) {
                res.send({
                    status: true,
                    data: result
                })
            }
            else {

            }

        })

        //Checking agents status
        app.get('/user/agent/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const user = await userCollection.findOne(query);
            res.send({ isAgent: user.role === 'agent' });
        })

        //Checking Admin status
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user.role === 'admin' });
        })

        //Checking user status
        app.get('/user/normaluser/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const user = await userCollection.findOne(query);
            if (user) {
                res.send({ userRole: user.role });
            } else {
                res.send({ status: false })
            }
            // console.log({userRole: user.role})
            // console.log(email);
        })

        // Cash in from agent account to user account
        app.put('/agent/cashin', async (req, res) => {
            const data = req.body;
            const { receiverEmail, agentEmail, amount } = data;
            const commi = (parseInt(amount) / 100) * 8;

            const user = await userCollection.findOne({ userEmail: receiverEmail });
            const agent = await userCollection.findOne({ userEmail: agentEmail });

            //Updationg agent balance and commission------------------
            const agentQuery = { userEmail: agentEmail };
            const Agentoption = { upsert: true };
            const AgentupdatedDoc = {
                $set: {
                    balance: parseInt(agent.balance) - parseInt(amount),
                    commission: parseFloat(parseFloat(agent.commission) + parseFloat(commi)).toFixed(2)
                }
            }
            const agentResult = await userCollection.updateOne(agentQuery, AgentupdatedDoc, Agentoption);


            //Updating user balance-----------------------
            const userQuery = { userEmail: receiverEmail };
            const userOption = { upsert: true };
            const userUpdatedDoc = {
                $set: {
                    balance: parseInt(user.balance) + parseInt(amount)
                }
            }
            const userResult = await userCollection.updateOne(userQuery, userUpdatedDoc, userOption);
            const result = await cashInCollection.insertOne(data)
            res.send(result);
        })

        app.get('/get/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // get all users info from database START
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await userCollection.find(query).toArray();
            res.send(users)
        });
        // get all users info from database END

        // get admin data START
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        });
        // get admin data END

        // set admin role START
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        // set admin role END

        // delete users START
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        });
        // delete users END

        // get all agents request START
        app.get('/agents/request', async (req, res) => {
            const query = {};
            const agents = await agentsRequestsCollection.find(query).toArray();
            res.send(agents)
        });
        // get all agents request END

        // agent status changed START
        app.patch('/users/agent/:email', async (req, res) => {
            const email = req.params.email;

            const filter = { email: email };
            const filter2 = { userEmail: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'accepted'
                }
            }
            const updatedDoc2 = {
                $set: {
                    role: 'agent'
                }
            }
            const result = await agentsRequestsCollection.updateOne(filter, updatedDoc, options);

            const result2 = await userCollection.updateOne(filter2, updatedDoc2, options);
            res.send(result);
        });
        // agent status changed END

        // get all approved agents data START
        app.get('/approvedAgents', async (req, res) => {
            const query = { status: 'accepted' };
            const allAgents = await agentsRequestsCollection.find(query).toArray();
            res.send(allAgents)
        });
        // get all approved agents data END

        // delete agent request START
        app.delete('/agents/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await agentsRequestsCollection.deleteOne(filter);
            res.send(result);
        });
        // delete agent request END

        app.post("/loanApplicantData", async (req, res) => {
            const loanApplicantData = req.body;
            const result = await loanApplicantsCollection.insertOne(loanApplicantData)
            res.send(result)
        });

        app.post('/agent/b2b', async (req, res) => {
            const data = req.body;
            const { receiverEmail, transferAmount, time, type, agentEmail } = data

            const user = await userCollection.findOne({ userEmail: receiverEmail });
            const agent = await userCollection.findOne({ userEmail: agentEmail });
            const agentQuery = { userEmail: agentEmail };
            const Agentoption = { upsert: true };
            const AgentupdatedDoc = {
                $set: {
                    balance: parseInt(agent.balance) - parseInt(transferAmount),
                }
            }
            const agentResult = await userCollection.updateOne(agentQuery, AgentupdatedDoc, Agentoption);
            const userQuery = { userEmail: receiverEmail };
            const userOption = { upsert: true };
            const userUpdatedDoc = {
                $set: {
                    balance: parseInt(user.balance) + parseInt(transferAmount)
                }
            }
            const userResult = await userCollection.updateOne(userQuery, userUpdatedDoc, userOption);

            const transitionInfo = {
                senderEmail: agentEmail,
                receiverEmail,
                amount: transferAmount,
                time,
                transactionId: crypto.randomBytes(6).toString('hex').toUpperCase(),
                type,
                notification: true
            }
            const result = await transactionCollection.insertOne(transitionInfo)
            res.send(result)
        });

        // get all Bill Categories on Bill Pay Section
        app.get('/billCategory', async (req, res) => {
            const query = {};
            const billCategory = await billCategoryCollection.find(query).toArray();
            res.send(billCategory)
        });

        app.get('/allCompanies/:category_id', async (req, res) => {
            const category_id = req.params.category_id;
            const query = { category_id };
            const allCompanies = await allCompaniesCollection.find(query).toArray();
            res.send(allCompanies);
        });

        app.get('/bill/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: ObjectId(id) };
            const allCompanies = await allCompaniesCollection.findOne(query);
            res.send(allCompanies);
        });

        app.put('/billing', async (req, res) => {
            const data = req.body;
            console.log(data)
            const { billing_Date, customer_Id, billing_Amount } = data;

            const user = await userCollection.findOne({ userEmail: customer_Id });

            //Updating user billing-----------------------
            const userQuery = { userEmail: customer_Id };
            const userOption = { upsert: true };
            const userUpdatedDoc = {
                $set: {
                    balance: parseInt(user.balance) - parseInt(billing_Amount)
                }
            }
            const userResult = await userCollection.updateOne(userQuery, userUpdatedDoc, userOption);
            const info = {
                billing_Date,
                customer_Id,
                transactionId: crypto.randomBytes(6).toString('hex').toUpperCase(),
                billing_Amount,
                type: "billing"
            }
            const transactionInfo = await transactionCollection.insertOne(info)
            res.send(transactionInfo)
        });
        // faq data for faq page 
        app.get('/faq', async (req, res) => {
            const query = {}
            const result = await faqCollection.find(query).toArray()
            res.send(result)
        });


        app.get('/loanRequestList', async (req, res) => {
            const query = {}
            const result = await loanApplicantsCollection.find(query).toArray()
            res.send(result)
        });


        app.put('/approveLoanRequest', async (req, res) => {
            const loanInfo = req.body;
            const { receiverEmail, amount } = loanInfo;

            // add amount receiver account
            const result = await userCollection.findOne({ userEmail: receiverEmail });
            const receiverBalance = result3.balance
            const receiverNewBalance = parseInt(receiverBalance) + parseInt(amount);

            const result2 = await userCollection.updateOne({ userEmail: receiverEmail }, { $set: { balance: receiverNewBalance } });

            const result3 = await loanApplicantsCollection.updateOne({ email: receiverEmail }, { $set: { loanRequest: accepted } })

            res.send(result3)

        });


        app.put('/withdraw', async (req, res) => {
            const withdrawInfo = req.body
            const { senderEmail, agentEmail, amount, time, type } = withdrawInfo
            // Decrease amount receiver account
            const result1 = await userCollection.findOne({ userEmail: senderEmail })
            const senderBalance = result1.balance
            const senderNewBalance = parseInt(senderBalance) - parseInt(amount)
            const result2 = await userCollection.updateOne({ userEmail: senderEmail }, { $set: { balance: senderNewBalance } });

            // add amount receiver account

            const result3 = await userCollection.findOne({ userEmail: agentEmail })
            const receiverBalance = result3.balance
            const receiverNewBalance = parseInt(receiverBalance) + parseInt(amount)
            const result4 = await userCollection.updateOne({ userEmail: agentEmail }, { $set: { balance: receiverNewBalance, notification: true } })

            const info = {
                senderEmail,
                receiverEmail: agentEmail,
                amount,
                time,
                transactionId: crypto.randomBytes(6).toString('hex').toUpperCase(),
                type: "withdraw",

            }

            const transactionInfo = await transactionCollection.insertOne(info)

            res.send(result2)
        });

        // loan request details 
        app.get('/loanRequestDetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await loanApplicantsCollection.findOne(query)
            res.send(result)
        });

        // delete/cancel loan request
        app.delete('/loanRequestList/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await loanApplicantsCollection.deleteOne(filter);
            res.send(result);
        });
       



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
