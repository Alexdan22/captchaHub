//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const uuid = require("uuid");
const path = require('path');
const shortid = require('shortid');
const cors = require('cors');
const schedule = require('node-schedule');
const sdk = require('api')('@decentro/v1.0#pwx2s1ddlp6q9m73');
const { DateTime } = require('luxon');
const xlsx = require('xlsx');
const fs = require('fs');
const app = express();
const QRCode = require('qrcode');

app.set('view engine', 'ejs');

app.use(cors())

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(express.static("public"));

app.use(cookieParser());

app.use(session({
    secret: process.env.RANDOM,
    saveUninitialized:false,
    resave: false
}));

mongoose.set('strictQuery', false);
// mongoose.connect("mongodb://localhost:27017/captchaHub");
mongoose.connect("mongodb+srv://alex-dan:Admin-12345@cluster0.wirm8.mongodb.net/captchaHub");


const timeZone = 'Asia/Kolkata';
const currentTimeInTimeZone = DateTime.now().setZone(timeZone);


let d = new Date();
let year = currentTimeInTimeZone.year;
let month = currentTimeInTimeZone.month;
let date = currentTimeInTimeZone.day;
let hour = currentTimeInTimeZone.hour;
let minutes = currentTimeInTimeZone.minute;
let seconds = d.getSeconds();




const earningSchema = new mongoose.Schema({
  captcha: Number,
  franchise: Number,
  total: Number,
  direct: Number,
  level: Number,
  club: Number,
  addition: Number,
  addition2: Number,
  addition3: Number,
  balance: Number
});
const bankDetailsSchema = new mongoose.Schema({
  name: String,
  accountNumber: String,
  bankName: String,
  ifsc: String
});
const transactionSchema = new mongoose.Schema({
  type: String,
  from: String,
  amount: Number,
  status: String,
  incomeType: String,
  userID: String,
  time:{
    date: String,
    month: String,
    year: String
  },
  trnxId: String
});
const clubSchema = new mongoose.Schema({
  team:{
    member1: String,
    member2: String,
    member3: String,
    member4: String
  },
  levels:{
    level1: Number,
    level2: Number,
    level3: Number,
    level4: Number,
    level5: Number,
    level6: Number
  },
  stage: Boolean
});
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  mobile: {
    type: Number,
    required: true
  },

  userID: {
    type: String,
    required: true
  },

  sponsorID: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  earnings: earningSchema,

  club: clubSchema,

  bankDetails: bankDetailsSchema,

  transaction: [transactionSchema],

  franchise:{
    silver: Number,
    gold: Number,
    diamond: Number,
  },

  status: String,

  package: {
    stage: String,
    days: Number,
    status: String,
    time:{
      date:Number,
      month:Number,
      year: Number
    }
  },

  time: {
    date: String,
    month: String,
    year: String
  }

});
const adminSchema = new mongoose.Schema({
  email: String,
  payment:[
    {
      trnxId: String,
      email: String,
      amount: Number,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
      status: String
    }
  ],
  withdrawal:[
    {
      trnxId: String,
      email: String,
      amount: Number,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
    }
  ],
  autobot:[
    {
      time:{
        date:Number,
        month:Number,
        year:Number
      },
      package: Number,
      users: Number,
      amount: Number,
      level: String,
      email:[String]
    }
  ],
  taskLink: String
});
const paymentSchema = new mongoose.Schema({
  trnxId: String,
  email: String,
  amount: Number,
  username: String,
  time:{
    date: String,
    month: String,
    year: String,
    minutes: String,
    hour: String
  },
  status: String
});
const pinSchema = new mongoose.Schema({
  pin: String,
  email: String,
  status: String,
  amount: Number,
  redemption:{
    email: String,
    userID: String,
    username: String,
    time:{
      date: Number,
      month: Number,
      year: Number
    }
  },
  time:{
    date: Number,
    month: Number,
    year: Number
  }
});
const qrDataSchema = new mongoose.Schema({ text: String });
const withdrawalSchema = new mongoose.Schema({mode: String});


userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

const Admin = new mongoose.model("Admin", adminSchema);

const Payment = new mongoose.model("Payment", paymentSchema);

const Data = new mongoose.model('Data', qrDataSchema);

const Pin = new mongoose.model('Pin', pinSchema);

const Switch = new mongoose.model('Switch', withdrawalSchema);


//Automated Functions
var job = schedule.scheduleJob('30 1 * * *', async(scheduledTime) => {
  try {
    const cooldown = await User.find({status: 'Active'});
    for (const users of cooldown) {
      if (users.package.status === 'Cooldown') {
        await User.updateOne({ email: users.email }, { $set: { 
          package: {
            stage:users.package.stage,
            days:users.package.days,
            status: 'Active',
            time:{
              date:users.package.time.date,
              month:users.package.time.month,
              year:users.package.time.year
            }
          }
        }});
      }
    }
  } catch (error) {
    console.log(error);
  }
});


//ROUTES
app.get("/", function(req, res){
  const alert = "false";
  res.render("login", {alert});
});

app.get("/register", function(req, res) {
  const sponsorID = req.session.sponsorID || null;
  const sponsor = sponsorID ? 'true' : 'false';
  const alert = "false";

  res.render("register", {
    alert,
    sponsor,
    sponsorID
  });
});

app.get('/updateSwitch', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    const foundSwitch = await Switch.find({});
    const mode = foundSwitch[0];
    
    if(mode.mode == 'ON'){
      await Switch.updateOne({mode:mode.mode}, {$set:{mode:'OFF'}});
      res.status(200).send({mode:'Turned OFF'})
    }
    if(mode.mode == 'OFF'){
      await Switch.updateOne({mode:mode.mode}, {$set:{mode:'ON'}});
      res.status(200).send({mode:'Turned ON'})
    }
  }
});

app.get("/register/:sponsorID", function(req, res){

  req.session.sponsorID = req.params.sponsorID;

  const alert = "false";
  const sponsor = 'true';
  const sponsorID = req.session.sponsorID;
  res.redirect('/register');
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    const foundSwitch = await Switch.find({});
    const mode = foundSwitch[0];
    if (!foundUser) {
      return res.redirect("/");
    }
    const foundDirect = await User.find({sponsorID: foundUser.userID});
    const current = foundDirect.filter(activeUsers => activeUsers.status == 'Active');
    const currentCount = current.length;


    const {
      username: name,
      email,
      userID,
      earnings: {
        captcha,
        franchise,
        total,
        direct,
        level,
        club,
        addition,
        addition2,
        addition3,
        balance
      },
      status,
      time,
      package
    } = foundUser;

    const alert = 'nil';
    const foundSponsor = await User.findOne({userID: foundUser.sponsorID});

      if(!foundSponsor){
        //With no Registered Sponsor ID
        res.render("dashboard", {
          name,
          email,
          mode:mode.mode,
          userID,
          captcha,
          franchise,
          total,
          direct,
          level,
          club,
          addition,
          addition2,
          addition3,
          currentCount,
          balance,
          package,
          alert,
          time,
          sponsorID:foundUser.sponsorID,
          status
        });
      }else{
        //With registered sponsor ID
        res.render("dashboard", {
          name,
          email,
          mode:mode.mode,
          userID,
          captcha,
          franchise,
          total,
          direct,
          level,
          club,
          addition,
          addition2,
          addition3,
          currentCount,
          balance,
          package,
          alert,
          time,
          sponsorID:foundSponsor.username,
          status
        });
      }
    
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }
});

app.get("/profile", async (req, res) =>{
  if (!req.session.user) {
    return res.redirect("/");
  }
  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    if (!foundUser) {
      return res.redirect("/");
    }
    
    const {
      username,
      email,
      status,
      mobile,
      userID
    } = foundUser;


    const foundSponsor = await User.findOne({userID: foundUser.sponsorID});

    if(!foundUser.bankDetails){
      const bank = 'Not provided'
      if(!foundSponsor){
        //With no Registered Sponsor ID
        
        res.render('profile', {username, email, userID,status, mobile, bank, sponsor:false,  sponsorID:foundUser.sponsorID});
      }else{
        //With registered sponsor ID
          res.render('profile', {username, email, userID,status, mobile, bank, sponsor:true, sponsorID:foundUser.sponsorID, sponsorName:foundSponsor.username});
      }
  
    }else{
      const bank = 'Exist'

      if(!foundSponsor){
        //With no Registered Sponsor ID
        
        res.render('profile', {username, email, userID,status, mobile, bank, bankDetails:foundUser.bankDetails, sponsor:false,  sponsorID:foundUser.sponsorID});
      }else{
        //With registered sponsor ID
          res.render('profile', {username, email, userID,status, mobile, bank, bankDetails:foundUser.bankDetails, sponsor:true, sponsorID:foundUser.sponsorID, sponsorName:foundSponsor.username});
      }
  
    }


  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }

});

app.get("/paymentGateway", async function(req, res) {
  if (!req.session.user) {
    res.redirect("/");
  } else {
    try {
      const foundUser = await User.findOne({ email: req.session.user.email });
      if (foundUser) {
        let data = await Data.findOne({});
        if (!data) {
          data = new Data({ text: "dummy@upiId" });
          await data.save();
          res.redirect('/dashboard');
        } else {
          if(foundUser.status == 'Active'){
            res.render("payment", {
              name: foundUser.username,
              email: foundUser.email,
              alert: 'nil',
              upiId: data.text,
              package: foundUser.package.stage,
              status: foundUser.status
            });
          }else{
            res.render("payment", {
              name: foundUser.username,
              email: foundUser.email,
              alert: 'nil',
              upiId: data.text,
              status: foundUser.status
            });
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/planDetails/:amount', async (req, res)=> {
  if(!req.session.user){
    res.status(200).send({redirect:true});
  }else{
    
    const amount = req.params.amount;
    let data = await Data.findOne({});

    if (!data) {
      data = new Data({ text: "dummy@upiId" });
      await data.save();
      res.redirect('/dashboard');
    } else {

      res.status(200).send({upiId: data.text,amount});
      
      
    }
  }
});

app.get("/log-out", function(req, res){
  req.session.destroy();
  res.redirect("/");
});

app.get('/generateQR', async (req, res) => {
  try {
    // Fetch data from MongoDB
    const data = await Data.findOne();
    if (!data) {
      const qr = new Data({
        text: "dummy@upiId"
      });
      qr.save();
      return res.status(404).send('No data found');
    }

    // Generate QR code
    const textToQr = "upi://pay?pa=" + data.text + "&mc=5399&pn=Google Pay Merchant&oobe=fos123&q";
    QRCode.toDataURL(textToQr, (err, url) => {
      if (err) {
        return res.status(500).send('Error generating QR code');
      }
      res.status(200).send({ url });
    });
  } catch (error) {
    res.status(500).send('Server error');
    console.log(error)
  }
});

app.get("/adminLogin", function(req, res){
  res.render("adminLogin");
});

app.get("/admin", async function(req, res) {
  if (!req.session.admin) {
    res.redirect("/adminLogin");
  } else {
    try {
      const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
      const foundUsers = await User.find({});
      const foundSwitch = await Switch.find({});
      const mode = foundSwitch[0];
      
      const total = foundUsers.length;
      const current = foundUsers.filter(activeUsers => activeUsers.status === 'Active');
      const currentUsers = current.length;

      
      res.render("admin", {
        total,
        currentUsers,
        mode,
        pendingApproval: foundAdmin.payment.length,
        pendingWithdraw: foundAdmin.withdrawal.length,
        payment: foundAdmin.payment,
        withdrawal: foundAdmin.withdrawal
      });
      
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/transaction', async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  } else {
    try {
      const foundUser = await User.findOne({ email: req.session.user.email });
      if (foundUser) {
        res.status(200).render('transaction',{
          name: foundUser.username,
          tab: 'false',
          email: foundUser.email,
          status: foundUser.status,
          transaction: foundUser.transaction,
          alert: 'nil'
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/transaction/:category', async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  } else {
    try {
      const foundUser = await User.findOne({ email: req.session.user.email });
      
      //Required Transaction Category
      let category = [];
      const input = req.params.category;

      if(input == 'captcha'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if('Daily Captcha' == data.from){
            category.push(data);
          }
        });
      }
      if(input == 'direct'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Direct'){
            category.push(data);
          }
        });
      }
      if(input == 'level'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Level - 1' || data.from == 'Level - 2' || data.from == 'Level - 3' || data.from == 'Level - 4' || data.from == 'Level - 5' || data.from == 'Level - 6' || data.from == 'Level - 7' || data.from == 'Level - 8' ||  data.from == 'Level - 9' || data.from == 'Level - 10'){
            category.push(data);
          }
        });
      }
      if(input == 'club'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Club Income'){
            category.push(data);
          }
        });
      }
      if(input == 'robot'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Captcha robot'){
            category.push(data);
          }
        });
      }
      if(input == 'reActivation'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Upgrade'){
            category.push(data);
          }
        });
      }
      if(input == 'withdrawal'){
        //Filtering Category from Transaction Array
        foundUser.transaction.forEach(function(data){
          if(data.from == 'Withdraw'){
            category.push(data);
          }
        });
      }

      

      if (foundUser) {
        res.status(200).render('transaction',{
          name: foundUser.username,
          tab: 'true',
          email: foundUser.email,
          transaction: category,
          status: foundUser.status,
          category: input,
          alert: 'nil'
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/api/dailyTask', async (req, res) =>{
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  let hour = currentTimeInTimeZone.hour;
  let minutes = currentTimeInTimeZone.minute;
  const trnxID = String(Math.floor(Math.random() * 999999999));

  if(!req.session.user){
    res.status(200).send({redirect:true});
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      let amount;
      if(foundUser.package.stage == 240){
        amount = 8;
      }
      if(foundUser.package.stage == 2000){
        amount = 50;
      }
      if(foundUser.package.stage == 7500){
        amount = 150;
      }
      
      if(foundUser.package.status == 'Active'){
        await User.updateOne({ email: foundUser.email }, {
          $set: {
            earnings: {
              captcha: foundUser.earnings.captcha + Number(amount),
              franchise: foundUser.earnings.franchise,
              total: foundUser.earnings.total + Number(amount),
              direct: foundUser.earnings.direct,
              level: foundUser.earnings.level,
              club: foundUser.earnings.club,
              addition: foundUser.earnings.addition,
              addition2: foundUser.earnings.addition2,
              addition3: foundUser.earnings.addition3,
              balance: foundUser.earnings.balance + Number(amount)
            }
          }
        });
        const newTransaction = {
          type: 'Credit',
          from: 'Daily Captcha',
          amount: amount,
          status: 'success',
          time: {
            date: date,
            month: month,
            year: year
          },
          trnxId: trnxID
        };
        let history = foundUser.transaction;
        history.push(newTransaction);
        await User.updateOne({ email: foundUser.email }, { $set: { transaction: history } });
  
        await User.updateOne({ email: foundUser.email }, { $set: { 
          package: {
            stage:foundUser.package.stage,
            days:foundUser.package.days - 1,
            status: 'Cooldown',
            time:{
              date:foundUser.package.time.date,
              month:foundUser.package.time.month,
              year:foundUser.package.time.year
            }
          } 
        } });
      }

    } catch (error) {
      console.log(error);
      
    }
  }
});

app.get('/api/manualTaskOverride', async (req, res) =>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const cooldown = await User.find({status:'Active'});
      cooldown.forEach(async(users)=>{
        if(users.package.status == 'Cooldown'){
          await User.updateOne({ email: users.email }, { $set: { 
            package: {
              stage:users.package.stage,
              days:users.package.days,
              status: 'Active',
              time:{
                date:users.package.time.date,
                month:users.package.time.month,
                year:users.package.time.year
              }
            } 
          } });
        }
      });
      res.redirect('/admin');
    } catch (error) {
      console.log(error);
      
    }
  }
});

app.get('/activeUsers', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const activeUsers = await User.find({status: 'Active'});
      res.render('users', {
        activeUsers
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/totalUsers', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const activeUsers = await User.find({});
      res.render('users', {
        activeUsers
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/viewUser/:email', async (req, res)=>{
  if(!req.session.admin){
     res.redirect('/adminLogin');
  }else{
    const email = req.params.email;
    try {
      const foundUser = await User.findOne({email:email});
      if (!foundUser) {
        return res.redirect('/admin');
      }
      if(foundUser){
        req.session.user = { email: foundUser.email };
        res.redirect("/dashboard");
      }
  
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/downline', async(req, res)=>{
  if(!req.session.user){
    res.redirect('/');
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      const foundDownlines = await User.find({sponsorID: foundUser.userID});
      res.render('downlines', {
        downline:foundDownlines,
        status:foundUser.status
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/downline/:sponsorID', async(req, res)=>{
  if(!req.session.user){
    res.redirect('/');
  }else{
    const userID = req.params.sponsorID;
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      const foundDownlines = await User.find({sponsorID: userID});
      res.render('downlines', {
        downline:foundDownlines,
        status:foundUser.status
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/franchise', async (req, res)=>{
  if(!req.session.user){
    res.redirect('/');
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      const foundDownline = await User.find({sponsorID:foundUser.userID});
      const foundPin = await Pin.find({email:foundUser.email});
      
      if(foundDownline.length >= 5){
        res.render('franchise', {
          status: foundUser.status,
          email: foundUser.email,
          userID:foundUser.userID,
          pin: foundPin,
          franchise: foundUser.franchise,
          balance: foundUser.earnings.balance
        });
      }else{
        res.redirect('/dashboard');
      }
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/download-mobile-numbers', async(req, res) => {
if(!req.session.admin){
  res.redirect('/admin');
}else{
  try {
      // Sample data, replace with your actual data
      const users = await User.find({});

      // Extract mobile numbers
      const mobileNumbers = users.map(user => ({"Name":user.username, "Email": user.email, "User ID": user.userID, "Mobile Number": `+91${user.mobile}`, "Total Earnings": user.earnings.total, "Available Balance": user.earnings.balance, "Status": user.status, "Sponsor ID": user.sponsorID }));

      // Create a new workbook
      const wb = xlsx.utils.book_new();

      // Convert data to a worksheet
      const ws = xlsx.utils.json_to_sheet(mobileNumbers);

      // Append the worksheet to the workbook
      xlsx.utils.book_append_sheet(wb, ws, 'Mobile Numbers');

      // Define the file path
      const filePath = path.join(__dirname, 'MobileNumbers.xlsx');

      // Write the workbook to the file
      xlsx.writeFile(wb, filePath);

      // Send the file for download
      res.download(filePath, 'MobileNumbers.xlsx', (err) => {
        if (err) {
          console.error('Error sending the file:', err);
          res.status(500).send('Could not download the file');
        }
        // Optional: Delete the file after download to save space
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting the file:', err);
          }
        });
      });

  
  } catch (err) {
    console.log(err);
    
  }
}

});

app.get("/clubTeam", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    const foundDirect = await User.find({sponsorID: foundUser.userID});
    const current = foundDirect.filter(activeUsers => activeUsers.status == 'Active');
    const currentCount = current.length;

    // Club system calculation Start
    let level1 = [];
    let level2 = [];
    let level3 = [];
    let level4 = [];
    let level5 = [];
    let level6 = [];
    let clubLevel;
    
    if (foundUser.club.stage == true) {
      const team = {
        team1: foundUser.club.team.member1,
        team2: foundUser.club.team.member2,
        team3: foundUser.club.team.member3,
        team4: foundUser.club.team.member4,
      };
    
      level1 = await Promise.all([
        User.findOne({ userID: team.team1 }),
        User.findOne({ userID: team.team2 }),
        User.findOne({ userID: team.team3 }),
        User.findOne({ userID: team.team4 })
      ]);
    
      async function getMembers(level) {
        const nextLevel = [];
        await Promise.all(level.map(async (member) => {
          if (member.club.stage == true) {
            const team = {
              team1: member.club.team.member1,
              team2: member.club.team.member2,
              team3: member.club.team.member3,
              team4: member.club.team.member4,
            };
            const members = await Promise.all([
              User.findOne({ userID: team.team1 }),
              User.findOne({ userID: team.team2 }),
              User.findOne({ userID: team.team3 }),
              User.findOne({ userID: team.team4 })
            ]);
            nextLevel.push(...members);
          }
        }));
        return nextLevel;
      }
    
      level2 = await getMembers(level1);
      level3 = await getMembers(level2);
      level4 = await getMembers(level3);
      level5 = await getMembers(level4);
      level6 = await getMembers(level5);
    
      console.log(level1.length, level2.length, level3.length, level4.length, level5.length, level6.length);
    }
    
    // Club system calculation End

    
    let level1Downline = [];
    let level2Downline = [];
    let level3Downline = [];
    let level4Downline = [];
    let level5Downline = [];
    let level6Downline = [];
    let totalDownline =[];
    
    // Helper function to get downline members
    async function getDownline(sponsorID) {
      return await User.find({ sponsorID });
    }
    
    // Helper function to handle downline level
    async function handleDownline(currentLevel) {
      const nextLevel = [];
      await Promise.all(currentLevel.map(async (user) => {
        const downline = await getDownline(user.userID);
        nextLevel.push(...downline);
      }));
      return nextLevel;
    }
    
    async function calculateDownlines() {
      // Level 1 Downline
      level1Downline = await handleDownline(foundDirect);
    
      // Level 2 Downline
      level2Downline = await handleDownline(level1Downline);
    
      // Level 3 Downline
      level3Downline = await handleDownline(level2Downline);
    
      // Level 4 Downline
      level4Downline = await handleDownline(level3Downline);
    
      // Level 5 Downline
      level5Downline = await handleDownline(level4Downline);
      
      // Level 6 Downline
      level6Downline = await handleDownline(level5Downline);
    
    // Combine all downlines into totalDownline 
      totalDownline = [ 
        ...foundDirect, 
        ...level1Downline, 
        ...level2Downline, 
        ...level3Downline, 
        ...level4Downline, 
        ...level5Downline, 
        ...level6Downline 
      ];
      return totalDownline;
    }
    
    // Call the function to calculate downlines
    
    totalDownline = await calculateDownlines();
    const totalActive = totalDownline.filter(activeUsers => activeUsers.status === 'Active');
    console.log(totalDownline.length, totalActive.length);
    
      //Club level calculation
    if(level1.length == 4){
      clubLevel = 1;
    }
    if(level2.length == 16){
      clubLevel = 2;
    }
    if(level3.length == 64){
      clubLevel = 3;
    }
    if(level4.length == 256){
      clubLevel = 4;
    }
    if(level5.length == 1024){
      clubLevel = 5;
    }
    if(level6.length == 4096){
      clubLevel = 6;
    }
    
    

    const {
      username: name,
      email,
      userID,
      status,
    } = foundUser;

    const alert = 'nil';

    res.render("club", {
      name,
      email,
      userID,
      clubTeam: foundUser.club,
      clubLevel,
      current,
      currentCount,
      totalDownline:totalDownline.length,
      totalActive:totalActive.length,
      alert,
      status,
      team: level1,
      level1:level1.length,
      level2:level2.length,
      level3:level3.length,
      level4:level4.length,
      level5:level5.length,
      level6:level6.length,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }
});

app.get("/clubTeam/:userID", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    const foundDirect = await User.find({sponsorID: foundUser.userID});
    const teamMember = await User.findOne({userID:req.params.userID});
    const teamMemberDirect = await User.find({sponsorID:teamMember.userID});

    let teamMemberDownline = [];

    if(teamMember.club.stage == true){
      const team = {
        team1: teamMember.club.team.member1,
        team2: teamMember.club.team.member2,
        team3: teamMember.club.team.member3,
        team4: teamMember.club.team.member4,
      };
    
      teamMemberDownline = await Promise.all([
        User.findOne({ userID: team.team1 }),
        User.findOne({ userID: team.team2 }),
        User.findOne({ userID: team.team3 }),
        User.findOne({ userID: team.team4 })
      ]);
    }

    // Club system calculation Start
    let level1 = [];
    let level2 = [];
    let level3 = [];
    let level4 = [];
    let level5 = [];
    let level6 = [];
    let clubLevel
    
    if (foundUser.club.stage == true) {
      const team = {
        team1: foundUser.club.team.member1,
        team2: foundUser.club.team.member2,
        team3: foundUser.club.team.member3,
        team4: foundUser.club.team.member4,
      };
    
      level1 = await Promise.all([
        User.findOne({ userID: team.team1 }),
        User.findOne({ userID: team.team2 }),
        User.findOne({ userID: team.team3 }),
        User.findOne({ userID: team.team4 })
      ]);
    
      async function getMembers(level) {
        const nextLevel = [];
        await Promise.all(level.map(async (member) => {
          if (member.club.stage == true) {
            const team = {
              team1: member.club.team.member1,
              team2: member.club.team.member2,
              team3: member.club.team.member3,
              team4: member.club.team.member4,
            };
            const members = await Promise.all([
              User.findOne({ userID: team.team1 }),
              User.findOne({ userID: team.team2 }),
              User.findOne({ userID: team.team3 }),
              User.findOne({ userID: team.team4 })
            ]);
            nextLevel.push(...members);
          }
        }));
        return nextLevel;
      }
    
      level2 = await getMembers(level1);
      level3 = await getMembers(level2);
      level4 = await getMembers(level3);
      level5 = await getMembers(level4);
      level6 = await getMembers(level5);
    
      console.log(level1.length, level2.length, level3.length, level4.length, level5.length, level6.length);
    }
    
    // Club system calculation End

    
    let level1Downline = [];
    let level2Downline = [];
    let level3Downline = [];
    let level4Downline = [];
    let level5Downline = [];
    let level6Downline = [];
    let totalDownline =[];
    
    // Helper function to get downline members
    async function getDownline(sponsorID) {
      return await User.find({ sponsorID });
    }
    
    // Helper function to handle downline level
    async function handleDownline(currentLevel) {
      const nextLevel = [];
      await Promise.all(currentLevel.map(async (user) => {
        const downline = await getDownline(user.userID);
        nextLevel.push(...downline);
      }));
      return nextLevel;
    }
    
    async function calculateDownlines() {
      // Level 1 Downline
      level1Downline = await handleDownline(foundDirect);
    
      // Level 2 Downline
      level2Downline = await handleDownline(level1Downline);
    
      // Level 3 Downline
      level3Downline = await handleDownline(level2Downline);
    
      // Level 4 Downline
      level4Downline = await handleDownline(level3Downline);
    
      // Level 5 Downline
      level5Downline = await handleDownline(level4Downline);
      
      // Level 6 Downline
      level6Downline = await handleDownline(level5Downline);
    
      const totalCount = foundDirect.length + level1Downline.length + level2Downline.length + level3Downline.length + level4Downline.length + level5Downline.length + level6Downline.length;
    // Combine all downlines into totalDownline 
      totalDownline = [ 
        ...foundDirect, 
        ...level1Downline, 
        ...level2Downline, 
        ...level3Downline, 
        ...level4Downline, 
        ...level5Downline, 
        ...level6Downline 
      ];
      return totalDownline;
    }
    
    // Call the function to calculate downlines
    
    totalDownline = await calculateDownlines();
    const totalActive = totalDownline.filter(activeUsers => activeUsers.status === 'Active');
    console.log(totalDownline.length, totalActive.length);

    //Club level calculation
    if(level1 == 4){
      clubLevel = 1;
    }
    if(level2 == 16){
      clubLevel = 2;
    }
    if(level3 == 64){
      clubLevel = 3;
    }
    if(level4 == 256){
      clubLevel = 4;
    }
    if(level5 == 1024){
      clubLevel = 5;
    }
    if(level6 == 4096){
      clubLevel = 6;
    }
    
    
    

    const {
      username: name,
      email,
      userID,
      status,
    } = foundUser;

    res.render("teamNetwork", {
      name,
      memberName:teamMember.username,
      email,
      userID,
      clubTeam: foundUser.club,
      clubLevel,
      totalDownline:totalDownline.length,
      totalActive:totalActive.length,
      status,
      stage:teamMember.club.stage,
      team: teamMemberDownline,
      teamMemberDirect,
      level1:level1.length,
      level2:level2.length,
      level3:level3.length,
      level4:level4.length,
      level5:level5.length,
      level6:level6.length,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }
});

app.get('/api/clubIncomeCredit', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const users = await User.find({});
      const current = users.filter(activeUsers => activeUsers.status === 'Active');

      current.forEach(async(foundUser)=>{
        
        const foundDirect = await User.find({sponsorID: foundUser.userID});
    
        // Club system calculation Start
        let level1 = [];
        let level2 = [];
        let level3 = [];
        let level4 = [];
        let level5 = [];
        let level6 = [];
        let clubLevel;
        
        if (foundUser.club.stage == true) {
          const team = {
            team1: foundUser.club.team.member1,
            team2: foundUser.club.team.member2,
            team3: foundUser.club.team.member3,
            team4: foundUser.club.team.member4,
          };
        
          level1 = await Promise.all([
            User.findOne({ userID: team.team1 }),
            User.findOne({ userID: team.team2 }),
            User.findOne({ userID: team.team3 }),
            User.findOne({ userID: team.team4 })
          ]);
        
          async function getMembers(level) {
            const nextLevel = [];
            await Promise.all(level.map(async (member) => {
              if (member.club.stage == true) {
                const team = {
                  team1: member.club.team.member1,
                  team2: member.club.team.member2,
                  team3: member.club.team.member3,
                  team4: member.club.team.member4,
                };
                const members = await Promise.all([
                  User.findOne({ userID: team.team1 }),
                  User.findOne({ userID: team.team2 }),
                  User.findOne({ userID: team.team3 }),
                  User.findOne({ userID: team.team4 })
                ]);
                nextLevel.push(...members);
              }
            }));
            return nextLevel;
          }
        
          level2 = await getMembers(level1);
          level3 = await getMembers(level2);
          level4 = await getMembers(level3);
          level5 = await getMembers(level4);
          level6 = await getMembers(level5);
        
        }
        
        // Club system calculation End

        
          //Club level calculation
        if(level1.length == 4){
          clubLevel = 1;
        }
        if(level2.length == 16){
          clubLevel = 2;
        }
        if(level3.length == 64){
          clubLevel = 3;
        }
        if(level4.length == 256){
          clubLevel = 4;
        }
        if(level5.length == 1024){
          clubLevel = 5;
        }
        if(level6.length == 4096){
          clubLevel = 6;
        }

        if(clubLevel == 1){

          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 20,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 20,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 20
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 20,
            status: 'success',
            trnxId: 'Level 1',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        if(clubLevel == 2){
          
          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 180,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 180,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 180
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 180,
            status: 'success',
            trnxId: 'Level 2',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        if(clubLevel == 3){
          
          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 1140,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 1140,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 1140
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 1140,
            status: 'success',
            trnxId: 'Level 3',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        if(clubLevel == 4){
          
          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 6260,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 6260,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 6260
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 6260,
            status: 'success',
            trnxId: 'Level 4',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        if(clubLevel == 5){
          
          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 31860,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 31860,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 31860
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 31860,
            status: 'success',
            trnxId: 'Level 5',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        if(clubLevel == 6){
          
          await User.updateOne({ email: foundUser.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + 154740,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club + 154740,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + 154740
              }
            }
          });

          const transaction = foundUser.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'Club Income',
            amount: 154740,
            status: 'success',
            trnxId: 'Level 6',
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: foundUser.email }, { $set: { transaction: transaction } });
        }
        
       
      });

    } catch (error) {
      console.log(error);
      
    }
  }
});

app.get('/api/autobot', async (req,res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const foundAdmin = await Admin.findOne({email: process.env.ADMIN});
      res.status(200).render('autobotHistory',{
        transaction: foundAdmin.autobot
      });

    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/adminDownline')





//POSTS
app.post('/api/register', async (req, res) => {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  let userID = "HUB" + String(Math.floor(Math.random() * 999999));
  
  const newUser = new User({
    username: req.body.username,
    email: req.body.email,
    mobile: Number(req.body.mobile),
    password: req.body.password,
    sponsorID: req.body.sponsorID,
    userID: userID,
    status: "Inactive",
    club:{
      stage:false
    },
    earnings: {
      captcha: 0,
      franchise: 0,
      total: 0,
      direct: 0,
      level: 0,
      club: 0,
      addition: 0,
      addition2: 0,
      addition3: 0,
      balance: 0
    },
    franchise:{
      silver: 0,
      gold: 0,
      diamond: 0,
    },
    time: {
      date: date,
      month: month,
      year: year
    },
    history: [],
    transaction: []
  });

  try {
    let foundUser = await User.findOne({ userID: userID });
    while (foundUser) {
      userID = "HUB" + String(Math.floor(Math.random() * 999999));
      foundUser = await User.findOne({ userID: userID });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(200).send({
        alertType: "warning",
        alert: "true",
        message: "The Email is already registered, Kindly login"
      });
    }else{
      if (req.body.password !== req.body.confirmPassword) {
        return res.status(200).send({
          alertType: "warning",
          alert: "true",
          message: "Password did not match"
        });
      }else{
        
        if(String(req.body.mobile).length != 10){
          return res.status(200).send({
            alertType: "warning",
            alert: "true",
            message: "Invalid mobile number"
          });
        }else{
          await newUser.save();
          res.status(200).send({
            alertType: "success",
            alert: "true",
            message: "Successfully created your Account"
          });
        }
      }
    }

    

    

  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const foundUser = await User.findOne({ email: req.body.email });

    if (!foundUser) {
      return res.status(200).send({
        alertType: "warning",
        alert: "true",
        message: "Email or Password Invalid",
      });
    }

    if (req.body.password === foundUser.password) {
      req.session.user = req.body;
      return res.status(200).send({
        alertType: "success",
        alert: "true",
        message: "Login successful...",
      });
    } else {
      return res.status(200).send({
        alertType: "warning",
        alert: "true",
        message: "Email or Password Invalid",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      alertType: "error",
      alert: "true",
      message: "An error occurred. Please try again later.",
    });
  }
});

app.post('/api/checkSponsor', async (req, res)=>{
  
  try {
    const foundUser = await User.findOne({userID:req.body.sponsorID});
    if(foundUser){
      res.status(200).send({sponsor:foundUser.username});
    }else{
      res.status(200).send({sponsor:'Not found'});
    }
  } catch (error) {
    console.log(error);
    
  }
});

app.post('/planActivation', async (req, res) => {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  const year = currentTimeInTimeZone.year;
  const month = currentTimeInTimeZone.month;
  const date = currentTimeInTimeZone.day;

  if (!req.session.admin) {
    res.redirect('/adminLogin');
  } else {
    let amount;
    if(Number(req.body.amount) == 175){
      amount = 240;
    }else{
      amount = Number(req.body.amount);
    }
    const trnxId = Number(req.body.trnxId);
    const directPercentage = Number(req.body.directPercentage);
    let levels = {
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
      level5: 0,
      level6: 0,
      level7: 0,
      level8: 0,
      level9: 0,
      level10: 0
    }
    if(amount == 240){
      levels = {
        level1: 24,
        level2: 6,
        level3: 6,
        level4: 6,
        level5: 3,
        level6: 3,
        level7: 3,
        level8: 1,
        level9: 1,
        level10: 1
      }
    }
    if(amount == 2000){
      levels = {
        level1: 200,
        level2: 40,
        level3: 40,
        level4: 40,
        level5: 20,
        level6: 20,
        level7: 20,
        level8: 5,
        level9: 5,
        level10: 5
      }
    }
    if(amount == 7500){
      levels = {
        level1: 750,
        level2: 100,
        level3: 100,
        level4: 100,
        level5: 50,
        level6: 50,
        level7: 50,
        level8: 25,
        level9: 25,
        level10: 25
      }
    }

    try {
      const foundUser = await User.findOne({ email: req.body.email });
      let type = 'direct';
      if (foundUser) {
        const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
        if (foundAdmin) {
          const foundPayment = await Payment.findOne({ trnxId: req.body.trnxId });

          const pendingPayments = foundAdmin.payment.filter(payment => payment.trnxId !== req.body.trnxId);

          await Admin.updateOne({ email: process.env.ADMIN }, { $set: { payment: pendingPayments } });

          if (req.body.approval === "false") {
            // Handle payment failure
            await Payment.updateOne({ trnxId: req.body.trnxId }, { $set: { trnxId: 'Failed transaction - ' + req.body.trnxId } });

            const updatedTransaction = foundUser.transaction.map(transaction => {
              if (transaction.trnxId === req.body.trnxId) {
                
                const modifiedTransaction = {
                  time: transaction.time,
                  type: transaction.type,
                  from: transaction.from,
                  amount: transaction.amount,
                  status: 'failed',
                  trnxId: transaction.trnxId,
                  _id: transaction._id
                };
                return modifiedTransaction;
              }
              return transaction;
            });
            
            
            try {
              const updateResult = await User.updateOne(
                { email: req.body.email },
                { $set: { transaction: updatedTransaction } }
              );
            } catch (error) {
              console.error("Error updating transaction:", error);
            }
            
            
            
            

          } else {
            
          await User.updateOne({ email: foundUser.email }, { $set: { status: "Active" } });
          await User.updateOne({ email: foundUser.email }, { $set: { 
            package: {
              stage:amount,
              days:150,
              status: 'Active',
              time:{
                date:date,
                month:month,
                year: year
              }
            } 
          } });

            const updatedTransaction = foundUser.transaction.map(transaction => {
              if (transaction.trnxId === req.body.trnxId) {

                if(transaction.from == 'ID upgrade'){
                  type = 'upgrade'
                }
                const modifiedTransaction = {
                  time: transaction.time,
                  type: transaction.type,
                  from: transaction.from,
                  amount: transaction.amount,
                  status: 'success',
                  trnxId: transaction.trnxId,
                  _id: transaction._id
                };
                return modifiedTransaction;
              }
              return transaction;
            });
            
            
            await User.updateOne({ email: req.body.email }, { $set: { transaction: updatedTransaction }});

            // Direct or Level 1 Income
            const foundSponsor = await User.findOne({ userID: foundUser.sponsorID });
            if (foundSponsor) {

              if(foundSponsor.status == 'Active'){
                if(type == 'direct'){

                  await User.updateOne({ email: foundSponsor.email }, {
                    $set: {
                      earnings: {
                        captcha: foundSponsor.earnings.captcha,
                        franchise: foundSponsor.earnings.franchise,
                        total: foundSponsor.earnings.total + Math.floor(amount * directPercentage),
                        direct: foundSponsor.earnings.direct + Math.floor(amount * directPercentage),
                        level: foundSponsor.earnings.level,
                        club: foundSponsor.earnings.club,
                        addition: foundSponsor.earnings.addition,
                        addition2: foundSponsor.earnings.addition2,
                        addition3: foundSponsor.earnings.addition3,
                        balance: foundSponsor.earnings.balance + Math.floor(amount * directPercentage)
                      }
                    }
                  });
    
                  const transaction = foundSponsor.transaction;
    
                  const newTrnx = {
                    type: 'Credit',
                    from: 'Direct',
                    amount: Math.floor(amount * directPercentage),
                    status: 'success',
                    trnxId: trnxId,
                    time: {
                      date: date,
                      month: month,
                      year: year
                    }
                  };
    
                  transaction.push(newTrnx);
    
    
                  await User.updateOne({ email: foundSponsor.email }, { $set: { transaction: transaction } });
                }
                if(type == 'upgrade'){
                  
                await User.updateOne({ email: foundSponsor.email }, {
                  $set: {
                    earnings: {
                      captcha: foundSponsor.earnings.captcha,
                      franchise: foundSponsor.earnings.franchise,
                      total: foundSponsor.earnings.total + Math.floor(amount * directPercentage),
                      direct: foundSponsor.earnings.direct,
                      level: foundSponsor.earnings.level,
                      club: foundSponsor.earnings.club,
                      addition: foundSponsor.earnings.addition,
                      addition2: foundSponsor.earnings.addition2 + Math.floor(amount * directPercentage),
                      addition3: foundSponsor.earnings.addition3,
                      balance: foundSponsor.earnings.balance + Math.floor(amount * directPercentage)
                    }
                  }
                });
  
                const transaction = foundSponsor.transaction;
  
                const newTrnx = {
                  type: 'Credit',
                  from: 'Upgrade',
                  amount: Math.floor(amount * directPercentage),
                  status: 'success',
                  trnxId: trnxId,
                  time: {
                    date: date,
                    month: month,
                    year: year
                  }
                };
  
                transaction.push(newTrnx);
  
  
                await User.updateOne({ email: foundSponsor.email }, { $set: { transaction: transaction } });
                }

              }

              // Level Income - 2nd Level
              const level2 = await User.findOne({ userID: foundSponsor.sponsorID });
              if (level2) {

                if(level2.status == 'Active'){

                  await User.updateOne({ email: level2.email }, {
                    $set: {
                      earnings: {
                        captcha: level2.earnings.captcha,
                        franchise: level2.earnings.franchise,
                        total: level2.earnings.total + levels.level2,
                        direct: level2.earnings.direct,
                        level: level2.earnings.level + levels.level2,
                        club: level2.earnings.club,
                        addition: level2.earnings.addition,
                        addition2: level2.earnings.addition2,
                        addition3: level2.earnings.addition3,
                        balance: level2.earnings.balance + levels.level2
                      }
                    }
                  });
  
                  const transaction = level2.transaction;
    
                  const newTrnx = {
                    type: 'Credit',
                    from: 'Level - 2',
                    amount: levels.level2,
                    status: 'success',
                    trnxId: trnxId,
                    time: {
                      date: date,
                      month: month,
                      year: year
                    }
                  };
    
                  transaction.push(newTrnx);
  
                  await User.updateOne({ email: level2.email }, { $set: { transaction: transaction } });

                }

                // Level Income - 3rd Level
                const level3 = await User.findOne({ userID: level2.sponsorID });
                if (level3) {

                  if(level3.status == 'Active'){

                    await User.updateOne({ email: level3.email }, {
                      $set: {
                        earnings: {
                          captcha: level3.earnings.captcha,
                          franchise: level3.earnings.franchise,
                          total: level3.earnings.total + levels.level3,
                          direct: level3.earnings.direct,
                          level: level3.earnings.level + levels.level3,
                          club: level3.earnings.club,
                          addition: level3.earnings.addition,
                          addition2: level3.earnings.addition2,
                          addition3: level3.earnings.addition3,
                          balance: level3.earnings.balance + levels.level3
                        }
                      }
                    });
  
                    const transaction = level3.transaction;
      
                    const newTrnx = {
                      type: 'Credit',
                      from: 'Level - 3',
                      amount: levels.level3,
                      status: 'success',
                      trnxId: trnxId,
                      time: {
                        date: date,
                        month: month,
                        year: year
                      }
                    };
      
                    transaction.push(newTrnx);
    
                    await User.updateOne({ email: level3.email }, { $set: { transaction: transaction } });

                  }

                  // Level Income - 4th Level
                  const level4 = await User.findOne({ userID: level3.sponsorID });
                  if (level4) {

                    if(level4.status == 'Active'){

                      await User.updateOne({ email: level4.email }, {
                        $set: {
                          earnings: {
                            captcha: level4.earnings.captcha,
                            franchise: level4.earnings.franchise,
                            total: level4.earnings.total + levels.level4,
                            direct: level4.earnings.direct,
                            level: level4.earnings.level + levels.level4,
                            club: level4.earnings.club,
                            addition: level4.earnings.addition,
                            addition2: level4.earnings.addition2,
                            addition3: level4.earnings.addition3,
                            balance: level4.earnings.balance + levels.level4
                          }
                        }
                      });
    
                      const transaction = level4.transaction;
        
                      const newTrnx = {
                        type: 'Credit',
                        from: 'Level - 4',
                        amount: levels.level4,
                        status: 'success',
                        trnxId: trnxId,
                        time: {
                          date: date,
                          month: month,
                          year: year
                        }
                      };
        
                      transaction.push(newTrnx);
      
                      await User.updateOne({ email: level4.email }, { $set: { transaction: transaction } });
                      
                    }

                    // Level Income - 5th Level
                    const level5 = await User.findOne({ userID: level4.sponsorID });
                    if (level5) {

                      if(level5.status == 'Active'){

                        await User.updateOne({ email: level5.email }, {
                          $set: {
                            earnings: {
                              captcha: level5.earnings.captcha,
                              franchise: level5.earnings.franchise,
                              total: level5.earnings.total + levels.level5,
                              direct: level5.earnings.direct,
                              level: level5.earnings.level + levels.level5,
                              club: level5.earnings.club,
                              addition: level5.earnings.addition,
                              addition2: level5.earnings.addition2,
                              addition3: level5.earnings.addition3,
                              balance: level5.earnings.balance + levels.level5
                            }
                          }
                        });
      
                        const transaction = level5.transaction;
          
                        const newTrnx = {
                          type: 'Credit',
                          from: 'Level - 5',
                          amount: levels.level5,
                          status: 'success',
                          trnxId: trnxId,
                          time: {
                            date: date,
                            month: month,
                            year: year
                          }
                        };
          
                        transaction.push(newTrnx);
        
                        await User.updateOne({ email: level5.email }, { $set: { transaction: transaction } });
                        
                      }

                      // Level Income - 6th Level
                      const level6 = await User.findOne({ userID: level5.sponsorID });
                      if (level6) {

                        if(level6.status == 'Active'){

                          await User.updateOne({ email: level6.email }, {
                            $set: {
                              earnings: {
                                captcha: level6.earnings.captcha,
                                franchise: level6.earnings.franchise,
                                total: level6.earnings.total + levels.level6,
                                direct: level6.earnings.direct,
                                level: level6.earnings.level + levels.level6,
                                club: level6.earnings.club,
                                addition: level6.earnings.addition,
                                addition2: level6.earnings.addition2,
                                addition3: level6.earnings.addition3,
                                balance: level6.earnings.balance + levels.level6
                              }
                            }
                          });
        
                          const transaction = level6.transaction;
            
                          const newTrnx = {
                            type: 'Credit',
                            from: 'Level - 6',
                            amount: levels.level6,
                            status: 'success',
                            trnxId: trnxId,
                            time: {
                              date: date,
                              month: month,
                              year: year
                            }
                          };
            
                          transaction.push(newTrnx);
          
                          await User.updateOne({ email: level6.email }, { $set: { transaction: transaction } });
                          
                        }

                        // Level Income - 7th Level
                        const level7 = await User.findOne({ userID: level6.sponsorID });
                        if (level7) {

                          if(level7.status == 'Active'){

                            await User.updateOne({ email: level7.email }, {
                              $set: {
                                earnings: {
                                  captcha: level7.earnings.captcha,
                                  franchise: level7.earnings.franchise,
                                  total: level7.earnings.total + levels.level7,
                                  direct: level7.earnings.direct,
                                  level: level7.earnings.level + levels.level7,
                                  club: level7.earnings.club,
                                  addition: level7.earnings.addition,
                                  addition2: level7.earnings.addition2,
                                  addition3: level7.earnings.addition3,
                                  balance: level7.earnings.balance + levels.level7
                                }
                              }
                            });
          
                            const transaction = level7.transaction;
              
                            const newTrnx = {
                              type: 'Credit',
                              from: 'Level - 7',
                              amount: levels.level7,
                              status: 'success',
                              trnxId: trnxId,
                              time: {
                                date: date,
                                month: month,
                                year: year
                              }
                            };
              
                            transaction.push(newTrnx);
            
                            await User.updateOne({ email: level7.email }, { $set: { transaction: transaction } });
                            
                          }

                          // Level Income - 8th Level
                          const level8 = await User.findOne({ userID: level7.sponsorID });
                          if (level8) {

                            if(level8.status == 'Active'){

                              await User.updateOne({ email: level8.email }, {
                                $set: {
                                  earnings: {
                                    captcha: level8.earnings.captcha,
                                    franchise: level8.earnings.franchise,
                                    total: level8.earnings.total + levels.level8,
                                    direct: level8.earnings.direct,
                                    level: level8.earnings.level + levels.level8,
                                    club: level8.earnings.club,
                                    addition: level8.earnings.addition,
                                    addition2: level8.earnings.addition2,
                                    addition3: level8.earnings.addition3,
                                    balance: level8.earnings.balance + levels.level8
                                  }
                                }
                              });
            
                              const transaction = level8.transaction;
                
                              const newTrnx = {
                                type: 'Credit',
                                from: 'Level - 8',
                                amount: levels.level8,
                                status: 'success',
                                trnxId: trnxId,
                                time: {
                                  date: date,
                                  month: month,
                                  year: year
                                }
                              };
                
                              transaction.push(newTrnx);
              
                              await User.updateOne({ email: level8.email }, { $set: { transaction: transaction } });
                              
                            }

                            // Level Income - 9th Level
                            const level9 = await User.findOne({ userID: level8.sponsorID });
                            if (level9) {

                              if(level9.status == 'Active'){

                                await User.updateOne({ email: level9.email }, {
                                  $set: {
                                    earnings: {
                                      captcha: level9.earnings.captcha,
                                      franchise: level9.earnings.franchise,
                                      total: level9.earnings.total + levels.level9,
                                      direct: level9.earnings.direct,
                                      level: level9.earnings.level + levels.level9,
                                      club: level9.earnings.club,
                                      addition: level9.earnings.addition,
                                      addition2: level9.earnings.addition2,
                                      addition3: level9.earnings.addition3,
                                      balance: level9.earnings.balance + levels.level9
                                    }
                                  }
                                });
              
                                const transaction = level9.transaction;
                  
                                const newTrnx = {
                                  type: 'Credit',
                                  from: 'Level - 9',
                                  amount: levels.level9,
                                  status: 'success',
                                  trnxId: trnxId,
                                  time: {
                                    date: date,
                                    month: month,
                                    year: year
                                  }
                                };
                  
                                transaction.push(newTrnx);
                
                                await User.updateOne({ email: level9.email }, { $set: { transaction: transaction } });
                                
                              }

                              // Level Income - 10th Level
                              const level10 = await User.findOne({ userID: level8.sponsorID });
                              if (level10) {

                                if(level10.status == 'Active'){

                                  await User.updateOne({ email: level10.email }, {
                                    $set: {
                                      earnings: {
                                        captcha: level10.earnings.captcha,
                                        franchise: level10.earnings.franchise,
                                        total: level10.earnings.total + levels.level10,
                                        direct: level10.earnings.direct,
                                        level: level10.earnings.level + levels.level10,
                                        club: level10.earnings.club,
                                        addition: level10.earnings.addition,
                                        addition2: level10.earnings.addition2,
                                        addition3: level10.earnings.addition3,
                                        balance: level10.earnings.balance + levels.level10
                                      }
                                    }
                                  });
                
                                  const transaction = level10.transaction;
                    
                                  const newTrnx = {
                                    type: 'Credit',
                                    from: 'Level - 10',
                                    amount: levels.level10,
                                    status: 'success',
                                    trnxId: trnxId,
                                    time: {
                                      date: date,
                                      month: month,
                                      year: year
                                    }
                                  };
                    
                                  transaction.push(newTrnx);
                  
                                  await User.updateOne({ email: level10.email }, { $set: { transaction: transaction } });
                                  
                                }

                                
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      res.redirect('/admin');
    } catch (err) {
      console.error(err);
    }
  }
});

app.post('/clubbing', async (req, res)=> {
  if(!req.session.user){
    res.redirect('/')
  }else{

    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      // Update foundUser's club team members
      await User.updateOne({email:foundUser.email}, {$set:{
        club:{
          team:{
            member1: req.body.member1,
            member2: req.body.member2,
            member3: req.body.member3,
            member4: req.body.member4
          },
          levels: {
            level1: 0,
            level2: 0,
            level3: 0,
            level4: 0,
            level5: 0,
            level6: 0
          },
          stage: "initial"

        }}})
      //Update Levels count
      const level1 = await User.findOne({userID:foundUser.sponsorID});
      if(level1){

        if(level1.status == 'Active'){

          await User.updateOne({email: level1.email}, {$set:{
            club:{
              levels:{
                level1: level1.club.levels.level1 +1,
                level2: level1.club.levels.level2,
                level3: level1.club.levels.level3,
                level4: level1.club.levels.level4,
                level5: level1.club.levels.level5,
                level6: level1.club.levels.level6
              }
            }
          }});

          if(level1.club.levels.level1 +1 == 1){
            await User.updateOne({email:level1.email}, {$set:{club:{stage:'level 1'}}})
          }

        }

        //Level 2
        const level2 = await User.findOne({userID:level1.sponsorID});
        if(level2){

          if(level2.status == 'Active'){

            await User.updateOne({email: level2.email}, {$set:{
              club:{
                levels:{
                  level1: level2.club.levels.level1,
                  level2: level2.club.levels.level2 +1,
                  level3: level2.club.levels.level3,
                  level4: level2.club.levels.level4,
                  level5: level2.club.levels.level5,
                  level6: level2.club.levels.level6
                }
              }
            }});

            if(level2.club.levels.level2 +1 == 4){
              await User.updateOne({email:level2.email}, {$set:{club:{stage:'level 2'}}})
            }

          }

          //Level 3
          const level3 = await User.findOne({userID:level2.sponsorID});
          if(level3){

            if(level3.status == 'Active'){

              await User.updateOne({email: level3.email}, {$set:{
                club:{
                  levels:{
                    level1: level3.club.levels.level1,
                    level2: level3.club.levels.level2,
                    level3: level3.club.levels.level3 +1,
                    level4: level3.club.levels.level4,
                    level5: level3.club.levels.level5,
                    level6: level3.club.levels.level6
                  }
                }
              }});

              if(level3.club.levels.level3 +1 == 16){
                await User.updateOne({email:level3.email}, {$set:{club:{stage:'level 3'}}})
              }

            }

            //Level 4
            const level4 = await User.findOne({userID:level3.sponsorID});
            if(level4){

              if(level4.status == 'Active'){

                await User.updateOne({email: level4.email}, {$set:{
                  club:{
                    levels:{
                      level1: level4.club.levels.level1,
                      level2: level4.club.levels.level2,
                      level3: level4.club.levels.level3,
                      level4: level4.club.levels.level4 +1,
                      level5: level4.club.levels.level5,
                      level6: level4.club.levels.level6
                    }
                  }
                }});

                if(level4.club.levels.level4 +1 == 64){
                  await User.updateOne({email:level4.email}, {$set:{club:{stage:'level 4'}}})
                }

              }

              //Level 5
              const level5 = await User.findOne({userID:level4.sponsorID});
              if(level5){

                if(level5.status == 'Active'){

                  await User.updateOne({email: level5.email}, {$set:{
                    club:{
                      levels:{
                        level1: level5.club.levels.level1,
                        level2: level5.club.levels.level2,
                        level3: level5.club.levels.level3,
                        level4: level5.club.levels.level4,
                        level5: level5.club.levels.level5 +1,
                        level6: level5.club.levels.level6
                      }
                    }
                  }});

                  if(level5.club.levels.level5 +1 == 256){
                    await User.updateOne({email:level5.email}, {$set:{club:{stage:'level 5'}}})
                  }

                }

                //Level 6
              const level6 = await User.findOne({userID:level5.sponsorID});
              if(level6){

                if(level6.status == 'Active'){

                  await User.updateOne({email: level6.email}, {$set:{
                    club:{
                      levels:{
                        level1: level6.club.levels.level1,
                        level2: level6.club.levels.level2,
                        level3: level6.club.levels.level3,
                        level4: level6.club.levels.level4,
                        level5: level6.club.levels.level5,
                        level6: level6.club.levels.level6 +1
                      }
                    }
                  }});

                  if(level6.club.levels.level6 +1 == 1024){
                    await User.updateOne({email:level6.email}, {$set:{club:{stage:'level 6'}}})
                  }

                }
                
              }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
      
    }
  }
});

app.post("/api/paymentVerification", async function(req, res) {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  let hour = currentTimeInTimeZone.hour;
  let minutes = currentTimeInTimeZone.minute;

  if (!req.session.user) {
    res.status(200).send({ redirect: true });
  } else {
    if (req.body.amount === "" || req.body.trnxId === "") {
      const alertType = "warning";
      const alert = "true";
      const message = "Kindly fill all the given details";
      res.status(200).send({ alertType, alert, message });
    } else {
      if(String(req.body.trnxId).length != 12){
        const alertType = "warning";
        const alert = "true";
        const message = "Enter valid UTR number";
        res.status(200).send({ alertType, alert, message });
      }else{
        try {
          const duplicate = await Payment.findOne({ trnxId: req.body.trnxId });
          if (duplicate) {
            const alertType = "warning";
            const alert = "true";
            const message = "Transaction already exists";
            res.status(200).send({ alertType, alert, message });
          } else {
            const foundUser = await User.findOne({ email: req.session.user.email });
            if (foundUser) {
              const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
              const newPayment = {
                trnxId: req.body.trnxId,
                email: foundUser.email,
                amount: req.body.amount,
                username: foundUser.username,
                time: {
                  date: date,
                  month: month,
                  year: year,
                  minutes: minutes,
                  hour: hour
                }
              };
  
              if (!foundAdmin) {
                const admin = new Admin({
                  email: process.env.ADMIN,
                  payment: [],
                  withdrawal: []
                });
                await admin.save();
  
                await Admin.updateOne({ email: process.env.ADMIN }, { $set: { payment: [newPayment] } });
              } else {
                let pendingPayments = foundAdmin.payment;
                pendingPayments.push(newPayment);
                await Admin.updateOne({ email: process.env.ADMIN }, { $set: { payment: pendingPayments } });
              }
  
              const newTransaction = {
                type: 'Credit',
                from: 'ID activation',
                amount: req.body.amount,
                status: 'Pending',
                time: {
                  date: date,
                  month: month,
                  year: year
                },
                trnxId: req.body.trnxId
              };
              let history = foundUser.transaction;
              history.push(newTransaction);
              await User.updateOne({ email: foundUser.email }, { $set: { transaction: history } });
  
              const newPaymentSchema = new Payment(newPayment);
              await newPaymentSchema.save();
  
              const alertType = "success";
              const alert = "true";
              const message = "Payment details submitted.";
              res.status(200).send({ alertType, alert, message });
            }
          }
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
});

app.post("/api/upgradeVerification", async function(req, res) {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  let hour = currentTimeInTimeZone.hour;
  let minutes = currentTimeInTimeZone.minute;

  if (!req.session.user) {
    res.status(200).send({ redirect: true });
  } else {
    if (req.body.amount === "" || req.body.trnxId === "") {
      const alertType = "warning";
      const alert = "true";
      const message = "Kindly fill all the given details";
      res.status(200).send({ alertType, alert, message });
    } else {
      if(String(req.body.trnxId).length != 12){
        const alertType = "warning";
        const alert = "true";
        const message = "Enter valid UTR number";
        res.status(200).send({ alertType, alert, message });
      }else{
        try {
          const duplicate = await Payment.findOne({ trnxId: req.body.trnxId });
          if (duplicate) {
            const alertType = "warning";
            const alert = "true";
            const message = "Transaction already exists";
            res.status(200).send({ alertType, alert, message });
          } else {
            const foundUser = await User.findOne({ email: req.session.user.email });
            if (foundUser) {
              const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
              const newPayment = {
                trnxId: req.body.trnxId,
                email: foundUser.email,
                amount: req.body.amount,
                username: foundUser.username,
                time: {
                  date: date,
                  month: month,
                  year: year,
                  minutes: minutes,
                  hour: hour
                }
              };
  
              if (!foundAdmin) {
                const admin = new Admin({
                  email: process.env.ADMIN,
                  payment: [],
                  withdrawal: []
                });
                await admin.save();
  
                await Admin.updateOne({ email: process.env.ADMIN }, { $set: { payment: [newPayment] } });
              } else {
                let pendingPayments = foundAdmin.payment;
                pendingPayments.push(newPayment);
                await Admin.updateOne({ email: process.env.ADMIN }, { $set: { payment: pendingPayments } });
              }
  
              const newTransaction = {
                type: 'Credit',
                from: 'ID upgrade',
                amount: req.body.amount,
                status: 'Pending',
                time: {
                  date: date,
                  month: month,
                  year: year
                },
                trnxId: req.body.trnxId
              };
              let history = foundUser.transaction;
              history.push(newTransaction);
              await User.updateOne({ email: foundUser.email }, { $set: { transaction: history } });
  
              const newPaymentSchema = new Payment(newPayment);
              await newPaymentSchema.save();
  
              const alertType = "success";
              const alert = "true";
              const message = "Payment details submitted.";
              res.status(200).send({ alertType, alert, message });
            }
          }
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
});

app.post("/api/bankDetails", async function(req, res) {
  if (!req.session.user) {
    return res.status(200).send({ redirect: true });
  }

  const bankDetails = {
    name: req.body.holdersName,
    accountNumber: req.body.accountNumber,
    bankName: req.body.bankName,
    ifsc: req.body.ifsc
  };

  try {
    await User.updateOne(
      { email: req.session.user.email },
      { $set: { bankDetails: bankDetails } }
    );

    const foundUser = await User.findOne({ email: req.session.user.email });

    res.status(200).send({
      alertType: "success",
      alert: "true",
      message: "Bank details updated successfully",
      loaderBg: '#f96868'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to update or retrieve bank details" });
  }
});

app.post("/adminLogin", function(req, res){
  
  if(process.env.ADMIN === req.body.email){
    if(process.env.PASSWORD === req.body.password){
      req.session.admin = req.body;

      res.redirect('/admin');
    }else{
      //Not an User
      res.redirect('/adminLogin');
    }
  }else{
    //Not an User
    res.redirect('/adminLogin');
  }
});

app.post("/api/withdrawal", async function(req, res) {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);
  const { year, month, day: date, hour, minute: minutes } = currentTimeInTimeZone;

  if (!req.session.user) {
    return res.status(200).send({ redirect: true });
  }else{
    const amount = Number(req.body.amount);
    try {
      const foundUser = await User.findOne({ email: req.session.user.email });
  
      if (!foundUser) {
        return res.status(404).send("User not found");
      }else{
        const newValue = foundUser.earnings.balance - Number(req.body.amount);
  
        if (amount < 199) {
          return res.status(200).send({
            alertType : "warning",
            alert : "true",
            message: "Entered amount is less than Minimum withdraw",
            balance: foundUser.earnings.balance
          });
        }else{
          if (foundUser.earnings.balance < amount) {
            return res.status(200).send({
              alertType : "warning",
              alert : "true",
              message: "Low balance!!",
              balance: foundUser.earnings.balance
            });
          }else{
            if (!foundUser.bankDetails) {
              return res.status(200).send({
                alertType : "warning",
                alert : "true",
                message: "Fill in you Bank Details to proceed",
                balance: foundUser.earnings.balance
              });
            }else{
              let limitReached = false;

              foundUser.transaction.forEach(transaction => {
                const { from, status, time } = transaction;
                const { date: transDate, month: transMonth } = time;

                
                if (from === "Withdraw" && 
                    (status === 'Pending' || status === 'success') && 
                    parseInt(transDate) === date && 
                    parseInt(transMonth) === month) {
                  limitReached = true;
                }
              });

              console.log(`limitReached: ${limitReached}`);

              if (limitReached === true) {
                return res.status(200).send({
                  alertType: "warning",
                  alert: "true",
                  message: "Daily Withdrawal limit reached",
                  balance: foundUser.earnings.balance
                });
              }else{
          
                await User.updateOne({ email: req.session.user.email }, {
                  $set: {
                    earnings: {
                      captcha: foundUser.earnings.captcha,
                      franchise: foundUser.earnings.franchise,
                      total: foundUser.earnings.total,
                      direct: foundUser.earnings.direct,
                      level: foundUser.earnings.level,
                      club: foundUser.earnings.club,
                      addition: foundUser.earnings.addition,
                      addition2: foundUser.earnings.addition2,
                      addition3: foundUser.earnings.addition3,
                      balance: newValue
                    }
                  }
                });
            
                const trnxID = String(Math.floor(Math.random() * 999999999));
            
                const newTransaction = {
                  type: 'Debit',
                  from: 'Withdraw',
                  amount: req.body.amount,
                  status: 'Pending',
                  time: { date, month, year },
                  trnxId: trnxID
                };
            
                await User.updateOne({ email: req.session.user.email }, {
                  $push: { transaction: newTransaction }
                });
            
                const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
            
                if (foundAdmin) {
                  const newWithdrawal = {
                    trnxId: trnxID,
                    amount: req.body.amount,
                    email: foundUser.email,
                    username: foundUser.username,
                    time: {
                      date,
                      month,
                      year,
                      minutes,
                      hour
                    }
                  };
            
                  await Admin.updateOne({ email: process.env.ADMIN }, {
                    $push: { withdrawal: newWithdrawal }
                  });
                }
            
                res.status(200).send({
                  alertType: "success",
                  alert: "true",
                  message: 'Withdrawal Success',
                  balance: newValue
                });
              }
            }
          }
        }
      }
  
      
  
      
  
      
  
      
  
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }

  
});

app.post("/api/creditWithdrawal", async function(req, res) {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);
  const { year, month, day: date, hour, minute: minutes } = currentTimeInTimeZone;

  if (!req.session.admin) {
    return res.redirect('/adminLogin');
  }

  try {
    const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
    if (!foundAdmin) {
      return res.status(404).send("Admin not found");
    }else{
      const foundUser = await User.findOne({ email: req.body.email });
      if (!foundUser) {
        return res.status(404).send("User not found");
      }else{
        
        if (req.body.approval === 'true') {
  
          const updatedTransaction = foundUser.transaction.map(transaction => {
            if (transaction.trnxId === req.body.trnxId) {
              const modifiedTransaction = {
                time: transaction.time,
                type: transaction.type,
                from: transaction.from,
                amount: transaction.amount,
                status: 'success',
                trnxId: transaction.trnxId,
                _id: transaction._id
              };
              return modifiedTransaction;
            }
            return transaction;
          });
          
          
          try {
            const updateResult = await User.updateOne(
              { email: req.body.email },
              { $set: { transaction: updatedTransaction } }
            );
          } catch (error) {
            console.error("Error updating transaction:", error);
          }
    
          let updatedArray = foundAdmin.withdrawal.filter(transaction => transaction.trnxId !== req.body.trnxId);
          await Admin.updateOne({ email: process.env.ADMIN }, { $set: { withdrawal: updatedArray } });
        } else {
          await User.updateOne({ email: req.body.email }, {
            $set: {
              earnings: {
                captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total,
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + Math.floor(Number(req.body.amount))
              }
            }
          });
    
          const updatedTransaction = foundUser.transaction.map(transaction => {
            if (transaction.trnxId === req.body.trnxId) {
              const modifiedTransaction = {
                time: transaction.time,
                type: transaction.type,
                from: transaction.from,
                amount: transaction.amount,
                status: 'failed',
                trnxId: transaction.trnxId,
                _id: transaction._id
              };
              return modifiedTransaction;
            }
            return transaction;
          });
          
          
          try {
            await User.updateOne(
              { email: req.body.email },
              { $set: { transaction: updatedTransaction } }
            );
          } catch (error) {
            console.error("Error updating transaction:", error);
          }
    
          let updatedArray = foundAdmin.withdrawal.filter(transaction => transaction.trnxId !== req.body.trnxId);
          await Admin.updateOne({ email: process.env.ADMIN }, { $set: { withdrawal: updatedArray } });
        }
      }
  
    }


    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/qrData", async (req, res) =>{
 if(!req.session.admin){
   res.redirect('/adminLogin');
 }else{
   try {
     // Fetch data from MongoDB
     const data = await Data.findOne();
     if (!data) {
       const qr = new Data({
         text: "dummy@upiId"
       });
       qr.save();
       res.redirect('/admin');
     }else{
           
       //Update QR or UPI details
       await Data.updateOne({}, {$set:{text:req.body.upi}});
       res.redirect('/admin');
     }
     

   } catch (error) {
     console.log(error);
   }

 }
});

app.post('/userPanel', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/adminLogin');
  }

  try {
    const { type, input } = req.body;
    const foundUser = type === "email" 
      ? await User.findOne({ email: input }) 
      : await User.findOne({ userID: input });

    if (!foundUser) {
      return res.redirect('/admin');
    }

    req.session.user = { email: foundUser.email };
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/creditBalance', async (req, res)=>{
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;


  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      
      const foundUser = await User.findOne({email:req.body.email});
      await User.updateOne({ email: foundUser.email }, {
        $set: {
          earnings: {
            captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + Math.floor(Number(req.body.amount)),
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3,
                balance: foundUser.earnings.balance + Math.floor(Number(req.body.amount))
          }
        }
      });
  
      const trnxID = String(Math.floor(Math.random() * 9999999));
  
      const newTransaction = {
        type: 'Credit',
        from: 'Income',
        amount: req.body.amount,
        status: 'success',
        time: { date, month, year },
        trnxId: trnxID
      };
  
      await User.updateOne({ email: foundUser.email }, {
        $push: { transaction: newTransaction }
      });
      res.redirect('/admin');
    } catch (err) {
      console.log(err);
    }
  }
});

app.post('/creditBonus', async (req, res)=>{
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;


  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      
      const foundUser = await User.findOne({email:req.body.email});
      await User.updateOne({ email: foundUser.email }, {
        $set: {
          earnings: {
            captcha: foundUser.earnings.captcha,
                franchise: foundUser.earnings.franchise,
                total: foundUser.earnings.total + Math.floor(Number(req.body.amount)),
                direct: foundUser.earnings.direct,
                level: foundUser.earnings.level,
                club: foundUser.earnings.club,
                addition: foundUser.earnings.addition,
                addition2: foundUser.earnings.addition2,
                addition3: foundUser.earnings.addition3 + Math.floor(Number(req.body.amount)),
                balance: foundUser.earnings.balance + Math.floor(Number(req.body.amount))
          }
        }
      });
  
      const trnxID = String(Math.floor(Math.random() * 9999999));
  
      const newTransaction = {
        type: 'Credit',
        from: 'Bonus Income',
        amount: req.body.amount,
        status: 'success',
        time: { date, month, year },
        trnxId: trnxID
      };
  
      await User.updateOne({ email: foundUser.email }, {
        $push: { transaction: newTransaction }
      });
      res.redirect('/admin');
    } catch (err) {
      console.log(err);
    }
  }
});

app.post('/api/createPin', async (req, res) => {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  if (!req.session.user) {
    res.redirect('/');
  } else {
    try {
      const foundUser = await User.findOne({ email: req.session.user.email });
      const amount = Number(req.body.amount);

      if (foundUser.earnings.balance < amount) {
        return res.status(200).send({
          alertType: "warning",
          alert: "true",
          message: "Low balance!!"
        });
      }

      if (foundUser.earnings.balance > amount) {
        function generateRandomString(length) {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = '';
          for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
          }
          return result;
        }

        let uniquePinFound = false;
        let random;

        // Loop until a unique PIN is found
        while (!uniquePinFound) {
          random = generateRandomString(8);
          const foundPin = await Pin.findOne({ pin: random });

          if (!foundPin) {
            uniquePinFound = true;
            // Save the pin to the database
            await new Pin({   
              pin: random,
              email: foundUser.email,
              status: 'Active',
              amount: req.body.amount,
              time:{
                date: date,
                month: month,
                year: year
              } }).save();

              //Temprovary Offer Code start
              if(amount == 240){

                //update user balance
                await User.updateOne({ email: req.session.user.email }, {
                  $set: {
                    earnings: {
                      captcha: foundUser.earnings.captcha,
                      franchise: foundUser.earnings.franchise,
                      total: foundUser.earnings.total,
                      direct: foundUser.earnings.direct,
                      level: foundUser.earnings.level,
                      club: foundUser.earnings.club,
                      addition: foundUser.earnings.addition,
                      addition2: foundUser.earnings.addition2,
                      addition3: foundUser.earnings.addition3,
                      balance: foundUser.earnings.balance - 175
                    }
                  }
                });
            
                const trnxID = String(Math.floor(Math.random() * 999999999));
            
                const newTransaction = {
                  type: 'Debit',
                  from: 'Pin Generation',
                  amount: 175,
                  status: 'success',
                  time: { date, month, year },
                  trnxId: trnxID
                };
            
                await User.updateOne({ email: req.session.user.email }, {
                  $push: { transaction: newTransaction }
                });
              }else{
                
                //update user balance
                await User.updateOne({ email: req.session.user.email }, {
                  $set: {
                    earnings: {
                      captcha: foundUser.earnings.captcha,
                      franchise: foundUser.earnings.franchise,
                      total: foundUser.earnings.total,
                      direct: foundUser.earnings.direct,
                      level: foundUser.earnings.level,
                      club: foundUser.earnings.club,
                      addition: foundUser.earnings.addition,
                      addition2: foundUser.earnings.addition2,
                      addition3: foundUser.earnings.addition3,
                      balance: foundUser.earnings.balance - amount
                    }
                  }
                });
            
                const trnxID = String(Math.floor(Math.random() * 999999999));
            
                const newTransaction = {
                  type: 'Debit',
                  from: 'Pin Generation',
                  amount: req.body.amount,
                  status: 'success',
                  time: { date, month, year },
                  trnxId: trnxID
                };
            
                await User.updateOne({ email: req.session.user.email }, {
                  $push: { transaction: newTransaction }
                });
              }
              //Temprovary Offer Code End


              //update pin count
              if(amount == 240){
                let newValue = foundUser.franchise.silver + 1;
                if(newValue == 12){
                  
                  function generateRandomString(length) {
                    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let result = '';
                    for (let i = 0; i < length; i++) {
                      result += characters.charAt(Math.floor(Math.random() * characters.length));
                    }
                    return result;
                  }
          
                  let uniquePinFound = false;
                  let random;
          
                  // Loop until a unique PIN is found
                  while (!uniquePinFound) {
                    random = generateRandomString(8);
                    const foundPin = await Pin.findOne({ pin: random });
          
                    if (!foundPin) {
                      uniquePinFound = true;
                      // Save the pin to the database
                      await new Pin({   
                        pin: random,
                        email: foundUser.email,
                        status: 'Active',
                        amount: req.body.amount,
                        time:{
                          date: date,
                          month: month,
                          year: year
                        } }).save();

                        await User.updateOne({email:foundUser.email}, {$set:{
                          franchise:{
                            silver: 0,
                            gold: foundUser.franchise.gold,
                            diamond: foundUser.franchise.diamond,
                          }}});
                    }
                  }
                }else{
                  await User.updateOne({email:foundUser.email}, {$set:{
                    franchise:{
                      silver: foundUser.franchise.silver + 1,
                      gold: foundUser.franchise.gold,
                      diamond: foundUser.franchise.diamond,
                    }}});
                }
              }
              if(amount == 2000){
                let newValue = foundUser.franchise.gold + 1;
                if(newValue == 12){
                  
                  function generateRandomString(length) {
                    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let result = '';
                    for (let i = 0; i < length; i++) {
                      result += characters.charAt(Math.floor(Math.random() * characters.length));
                    }
                    return result;
                  }
          
                  let uniquePinFound = false;
                  let random;
          
                  // Loop until a unique PIN is found
                  while (!uniquePinFound) {
                    random = generateRandomString(8);
                    const foundPin = await Pin.findOne({ pin: random });
          
                    if (!foundPin) {
                      uniquePinFound = true;
                      // Save the pin to the database
                      await new Pin({   
                        pin: random,
                        email: foundUser.email,
                        status: 'Active',
                        amount: req.body.amount,
                        time:{
                          date: date,
                          month: month,
                          year: year
                        } }).save();

                        await User.updateOne({email:foundUser.email}, {$set:{
                          franchise:{
                            silver: foundUser.franchise.silver,
                            gold: 0,
                            diamond: foundUser.franchise.diamond,
                          }}});
                    }
                  }
                }else{
                  await User.updateOne({email:foundUser.email}, {$set:{
                    franchise:{
                      silver: foundUser.franchise.silver,
                      gold: foundUser.franchise.gold + 1,
                      diamond: foundUser.franchise.diamond,
                    }}});
                }
              }
              if(amount == 7500){
                let newValue = foundUser.franchise.diamond + 1;
                if(newValue == 12){
                  
                  function generateRandomString(length) {
                    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let result = '';
                    for (let i = 0; i < length; i++) {
                      result += characters.charAt(Math.floor(Math.random() * characters.length));
                    }
                    return result;
                  }
          
                  let uniquePinFound = false;
                  let random;
          
                  // Loop until a unique PIN is found
                  while (!uniquePinFound) {
                    random = generateRandomString(8);
                    const foundPin = await Pin.findOne({ pin: random });
          
                    if (!foundPin) {
                      uniquePinFound = true;
                      // Save the pin to the database
                      await new Pin({   
                        pin: random,
                        email: foundUser.email,
                        status: 'Active',
                        amount: req.body.amount,
                        time:{
                          date: date,
                          month: month,
                          year: year
                        } }).save();

                        await User.updateOne({email:foundUser.email}, {$set:{
                          franchise:{
                            silver: foundUser.franchise.silver,
                            gold: foundUser.franchise.gold,
                            diamond: 0
                          }}});
                    }
                  }
                }else{
                  await User.updateOne({email:foundUser.email}, {$set:{
                    franchise:{
                      silver: foundUser.franchise.silver,
                      gold: foundUser.franchise.gold,
                      diamond: foundUser.franchise.diamond + 1
                    }}});
                }
              }
            return res.status(200).send({
              alertType: "success",
              alert: "true",
              message: "PIN generation successful."
            });
          }
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal server error");
    }
  }
});

app.post('/activateUser', async (req, res)=>{
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);
  
  
  let d = new Date();
  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;


  if(!req.session.user){
    res.redirect('/');
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      const activate = await User.findOne({userID:req.body.userID});
      const pin = await Pin.findOne({pin:req.body.pin});
      if(activate){
        console.log(pin, req.body);
        
        if(pin.status == 'Active'){
          
        await Pin.updateOne({pin:req.body.pin}, {$set:{
          redemption:{
            email: activate.email,
            userID: activate.userID,
            username: activate.username,
            time:{
              date: date,
              month: month,
              year: year
            }
          }}});
        await Pin.updateOne({pin:req.body.pin}, {$set:{status:'Redeemed'}});

        const amount = Number(pin.amount);
        const trnxId = req.body.pin;
        const directPercentage = 0.10;  
        let levels = {
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0,
          level5: 0,
          level6: 0,
          level7: 0,
          level8: 0,
          level9: 0,
          level10: 0
        }
        if(amount == 240){
          levels = {
            level1: 24,
            level2: 6,
            level3: 6,
            level4: 6,
            level5: 3,
            level6: 3,
            level7: 3,
            level8: 1,
            level9: 1,
            level10: 1
          }
        }
        if(amount == 2000){
          levels = {
            level1: 200,
            level2: 40,
            level3: 40,
            level4: 40,
            level5: 20,
            level6: 20,
            level7: 20,
            level8: 5,
            level9: 5,
            level10: 5
          }
        }
        if(amount == 7500){
          levels = {
            level1: 750,
            level2: 100,
            level3: 100,
            level4: 100,
            level5: 50,
            level6: 50,
            level7: 50,
            level8: 25,
            level9: 25,
            level10: 25
          }
        }

        await User.updateOne({ userID: activate.userID }, { $set: { status: "Active" } });
        await User.updateOne({ userID: activate.userID }, { $set: { 
            package: {
              stage:amount,
              days:150,
              status: 'Active',
              time:{
                date:date,
                month:month,
                year: year
              }
            } 
          } });
  
          const transaction = activate.transaction;

          const newTrnx = {
            type: 'Credit',
            from: 'ID activation',
            amount: amount,
            status: 'success',
            trnxId: trnxId,
            time: {
              date: date,
              month: month,
              year: year
            }
          };

          transaction.push(newTrnx);


          await User.updateOne({ email: activate.email }, { $set: { transaction: transaction } });

            // Direct or Level 1 Income
            const foundSponsor = await User.findOne({ userID: activate.sponsorID });
            if (foundSponsor) {

              if(foundSponsor.status == 'Active'){

                await User.updateOne({ email: foundSponsor.email }, {
                  $set: {
                    earnings: {
                      captcha: foundSponsor.earnings.captcha,
                      franchise: foundSponsor.earnings.franchise,
                      total: foundSponsor.earnings.total + Math.floor(amount * directPercentage),
                      direct: foundSponsor.earnings.direct + Math.floor(amount * directPercentage),
                      level: foundSponsor.earnings.level,
                      club: foundSponsor.earnings.club,
                      addition: foundSponsor.earnings.addition,
                      addition2: foundSponsor.earnings.addition2,
                      addition3: foundSponsor.earnings.addition3,
                      balance: foundSponsor.earnings.balance + Math.floor(amount * directPercentage)
                    }
                  }
                });
  
                const transaction = foundSponsor.transaction;
  
                const newTrnx = {
                  type: 'Credit',
                  from: 'Direct',
                  amount: Math.floor(amount * directPercentage),
                  status: 'success',
                  trnxId: trnxId,
                  time: {
                    date: date,
                    month: month,
                    year: year
                  }
                };
  
                transaction.push(newTrnx);
  
  
                await User.updateOne({ email: foundSponsor.email }, { $set: { transaction: transaction } });

              }

              // Level Income - 2nd Level
              const level2 = await User.findOne({ userID: foundSponsor.sponsorID });
              if (level2) {

                if(level2.status == 'Active'){

                  await User.updateOne({ email: level2.email }, {
                    $set: {
                      earnings: {
                        captcha: level2.earnings.captcha,
                        franchise: level2.earnings.franchise,
                        total: level2.earnings.total + levels.level2,
                        direct: level2.earnings.direct,
                        level: level2.earnings.level + levels.level2,
                        club: level2.earnings.club,
                        addition: level2.earnings.addition,
                        addition2: level2.earnings.addition2,
                        addition3: level2.earnings.addition3,
                        balance: level2.earnings.balance + levels.level2
                      }
                    }
                  });
  
                  const transaction = level2.transaction;
    
                  const newTrnx = {
                    type: 'Credit',
                    from: 'Level - 2',
                    amount: levels.level2,
                    status: 'success',
                    trnxId: trnxId,
                    time: {
                      date: date,
                      month: month,
                      year: year
                    }
                  };
    
                  transaction.push(newTrnx);
  
                  await User.updateOne({ email: level2.email }, { $set: { transaction: transaction } });

                }

                // Level Income - 3rd Level
                const level3 = await User.findOne({ userID: level2.sponsorID });
                if (level3) {

                  if(level3.status == 'Active'){

                    await User.updateOne({ email: level3.email }, {
                      $set: {
                        earnings: {
                          captcha: level3.earnings.captcha,
                          franchise: level3.earnings.franchise,
                          total: level3.earnings.total + levels.level3,
                          direct: level3.earnings.direct,
                          level: level3.earnings.level + levels.level3,
                          club: level3.earnings.club,
                          addition: level3.earnings.addition,
                          addition2: level3.earnings.addition2,
                          addition3: level3.earnings.addition3,
                          balance: level3.earnings.balance + levels.level3
                        }
                      }
                    });
  
                    const transaction = level3.transaction;
      
                    const newTrnx = {
                      type: 'Credit',
                      from: 'Level - 3',
                      amount: levels.level3,
                      status: 'success',
                      trnxId: trnxId,
                      time: {
                        date: date,
                        month: month,
                        year: year
                      }
                    };
      
                    transaction.push(newTrnx);
    
                    await User.updateOne({ email: level3.email }, { $set: { transaction: transaction } });

                  }

                  // Level Income - 4th Level
                  const level4 = await User.findOne({ userID: level3.sponsorID });
                  if (level4) {

                    if(level4.status == 'Active'){

                      await User.updateOne({ email: level4.email }, {
                        $set: {
                          earnings: {
                            captcha: level4.earnings.captcha,
                            franchise: level4.earnings.franchise,
                            total: level4.earnings.total + levels.level4,
                            direct: level4.earnings.direct,
                            level: level4.earnings.level + levels.level4,
                            club: level4.earnings.club,
                            addition: level4.earnings.addition,
                            addition2: level4.earnings.addition2,
                            addition3: level4.earnings.addition3,
                            balance: level4.earnings.balance + levels.level4
                          }
                        }
                      });
    
                      const transaction = level4.transaction;
        
                      const newTrnx = {
                        type: 'Credit',
                        from: 'Level - 4',
                        amount: levels.level4,
                        status: 'success',
                        trnxId: trnxId,
                        time: {
                          date: date,
                          month: month,
                          year: year
                        }
                      };
        
                      transaction.push(newTrnx);
      
                      await User.updateOne({ email: level4.email }, { $set: { transaction: transaction } });
                      
                    }

                    // Level Income - 5th Level
                    const level5 = await User.findOne({ userID: level4.sponsorID });
                    if (level5) {

                      if(level5.status == 'Active'){

                        await User.updateOne({ email: level5.email }, {
                          $set: {
                            earnings: {
                              captcha: level5.earnings.captcha,
                              franchise: level5.earnings.franchise,
                              total: level5.earnings.total + levels.level5,
                              direct: level5.earnings.direct,
                              level: level5.earnings.level + levels.level5,
                              club: level5.earnings.club,
                              addition: level5.earnings.addition,
                              addition2: level5.earnings.addition2,
                              addition3: level5.earnings.addition3,
                              balance: level5.earnings.balance + levels.level5
                            }
                          }
                        });
      
                        const transaction = level5.transaction;
          
                        const newTrnx = {
                          type: 'Credit',
                          from: 'Level - 5',
                          amount: levels.level5,
                          status: 'success',
                          trnxId: trnxId,
                          time: {
                            date: date,
                            month: month,
                            year: year
                          }
                        };
          
                        transaction.push(newTrnx);
        
                        await User.updateOne({ email: level5.email }, { $set: { transaction: transaction } });
                        
                      }

                      // Level Income - 6th Level
                      const level6 = await User.findOne({ userID: level5.sponsorID });
                      if (level6) {

                        if(level6.status == 'Active'){

                          await User.updateOne({ email: level6.email }, {
                            $set: {
                              earnings: {
                                captcha: level6.earnings.captcha,
                                franchise: level6.earnings.franchise,
                                total: level6.earnings.total + levels.level6,
                                direct: level6.earnings.direct,
                                level: level6.earnings.level + levels.level6,
                                club: level6.earnings.club,
                                addition: level6.earnings.addition,
                                addition2: level6.earnings.addition2,
                                addition3: level6.earnings.addition3,
                                balance: level6.earnings.balance + levels.level6
                              }
                            }
                          });
        
                          const transaction = level6.transaction;
            
                          const newTrnx = {
                            type: 'Credit',
                            from: 'Level - 6',
                            amount: levels.level6,
                            status: 'success',
                            trnxId: trnxId,
                            time: {
                              date: date,
                              month: month,
                              year: year
                            }
                          };
            
                          transaction.push(newTrnx);
          
                          await User.updateOne({ email: level6.email }, { $set: { transaction: transaction } });
                          
                        }

                        // Level Income - 7th Level
                        const level7 = await User.findOne({ userID: level6.sponsorID });
                        if (level7) {

                          if(level7.status == 'Active'){

                            await User.updateOne({ email: level7.email }, {
                              $set: {
                                earnings: {
                                  captcha: level7.earnings.captcha,
                                  franchise: level7.earnings.franchise,
                                  total: level7.earnings.total + levels.level7,
                                  direct: level7.earnings.direct,
                                  level: level7.earnings.level + levels.level7,
                                  club: level7.earnings.club,
                                  addition: level7.earnings.addition,
                                  addition2: level7.earnings.addition2,
                                  addition3: level7.earnings.addition3,
                                  balance: level7.earnings.balance + levels.level7
                                }
                              }
                            });
          
                            const transaction = level7.transaction;
              
                            const newTrnx = {
                              type: 'Credit',
                              from: 'Level - 7',
                              amount: levels.level7,
                              status: 'success',
                              trnxId: trnxId,
                              time: {
                                date: date,
                                month: month,
                                year: year
                              }
                            };
              
                            transaction.push(newTrnx);
            
                            await User.updateOne({ email: level7.email }, { $set: { transaction: transaction } });
                            
                          }

                          // Level Income - 8th Level
                          const level8 = await User.findOne({ userID: level7.sponsorID });
                          if (level8) {

                            if(level8.status == 'Active'){

                              await User.updateOne({ email: level8.email }, {
                                $set: {
                                  earnings: {
                                    captcha: level8.earnings.captcha,
                                    franchise: level8.earnings.franchise,
                                    total: level8.earnings.total + levels.level8,
                                    direct: level8.earnings.direct,
                                    level: level8.earnings.level + levels.level8,
                                    club: level8.earnings.club,
                                    addition: level8.earnings.addition,
                                    addition2: level8.earnings.addition2,
                                    addition3: level8.earnings.addition3,
                                    balance: level8.earnings.balance + levels.level8
                                  }
                                }
                              });
            
                              const transaction = level8.transaction;
                
                              const newTrnx = {
                                type: 'Credit',
                                from: 'Level - 8',
                                amount: levels.level8,
                                status: 'success',
                                trnxId: trnxId,
                                time: {
                                  date: date,
                                  month: month,
                                  year: year
                                }
                              };
                
                              transaction.push(newTrnx);
              
                              await User.updateOne({ email: level8.email }, { $set: { transaction: transaction } });
                              
                            }

                            // Level Income - 9th Level
                            const level9 = await User.findOne({ userID: level8.sponsorID });
                            if (level9) {

                              if(level9.status == 'Active'){

                                await User.updateOne({ email: level9.email }, {
                                  $set: {
                                    earnings: {
                                      captcha: level9.earnings.captcha,
                                      franchise: level9.earnings.franchise,
                                      total: level9.earnings.total + levels.level9,
                                      direct: level9.earnings.direct,
                                      level: level9.earnings.level + levels.level9,
                                      club: level9.earnings.club,
                                      addition: level9.earnings.addition,
                                      addition2: level9.earnings.addition2,
                                      addition3: level9.earnings.addition3,
                                      balance: level9.earnings.balance + levels.level9
                                    }
                                  }
                                });
              
                                const transaction = level9.transaction;
                  
                                const newTrnx = {
                                  type: 'Credit',
                                  from: 'Level - 9',
                                  amount: levels.level9,
                                  status: 'success',
                                  trnxId: trnxId,
                                  time: {
                                    date: date,
                                    month: month,
                                    year: year
                                  }
                                };
                  
                                transaction.push(newTrnx);
                
                                await User.updateOne({ email: level9.email }, { $set: { transaction: transaction } });
                                
                              }

                              // Level Income - 10th Level
                              const level10 = await User.findOne({ userID: level8.sponsorID });
                              if (level10) {

                                if(level10.status == 'Active'){

                                  await User.updateOne({ email: level10.email }, {
                                    $set: {
                                      earnings: {
                                        captcha: level10.earnings.captcha,
                                        franchise: level10.earnings.franchise,
                                        total: level10.earnings.total + levels.level10,
                                        direct: level10.earnings.direct,
                                        level: level10.earnings.level + levels.level10,
                                        club: level10.earnings.club,
                                        addition: level10.earnings.addition,
                                        addition2: level10.earnings.addition2,
                                        addition3: level10.earnings.addition3,
                                        balance: level10.earnings.balance + levels.level10
                                      }
                                    }
                                  });
                
                                  const transaction = level10.transaction;
                    
                                  const newTrnx = {
                                    type: 'Credit',
                                    from: 'Level - 10',
                                    amount: levels.level10,
                                    status: 'success',
                                    trnxId: trnxId,
                                    time: {
                                      date: date,
                                      month: month,
                                      year: year
                                    }
                                  };
                    
                                  transaction.push(newTrnx);
                  
                                  await User.updateOne({ email: level10.email }, { $set: { transaction: transaction } });
                                  
                                }

                                
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
        }

      }
    } catch (err) {
      console.log(err);
    }
    res.redirect('/dashboard');
  }
});

app.post('/api/checkUsers', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const inputDate = req.body.date;
      const [year, month, date] = inputDate.split('-');
      
      
      const foundUsers = await User.find({status: 'Active'});
      let stageFilter= [];
      let dateFilter= [];
      foundUsers.forEach(function(user){
        if(Number(user.package.stage) == Number(req.body.amount)){
          stageFilter.push(user);
        }
      });
      stageFilter.forEach(function(user){
        if(user.package.time.date == date && user.package.time.month == month && user.package.time.year == year){
          dateFilter.push(user);
        }
      });
      
      
      return res.status(200).send({users:dateFilter})

    } catch (error) {
      console.log(error);
      
    }
  }
});

app.post('/creditAutobot', async(req,res)=>{
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);
  const { year, month, day: date, hour, minute: minutes } = currentTimeInTimeZone;

  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const amount = Number(req.body.amount);
      const level = req.body.level;
      const users = req.body.email;
      let totalAmount = 0;
      let totalUser = users.length;
      
      const levelCredits = {
        240: {
          level1: 3,
          level2: 5,
          level3: 7,
          level4: 15,
          level5: 20,
          level6: 30,
          level7: 70,
          level8: 150,
          level9: 200,
          level10: 500
        },
        2000: {
          level1: 20,
          level2: 30,
          level3: 50,
          level4: 100,
          level5: 400,
          level6: 600,
          level7: 800,
          level8: 1000,
          level9: 2000,
          level10: 5000
        },
        7500: {
          level1: 30,
          level2: 70,
          level3: 100,
          level4: 200,
          level5: 600,
          level6: 1000,
          level7: 2000,
          level8: 4000,
          level9: 8000,
          level10: 14000
        }
      };

      let levelCredit = levelCredits[amount] ? levelCredits[amount][level] : undefined;


      await Promise.all(users.map(async (user) => {
        
        const foundUser = await User.findOne({ email: user });
        await User.updateOne({ email: foundUser.email }, {
          $set: {
            earnings: {
              captcha: foundUser.earnings.captcha,
              franchise: foundUser.earnings.franchise,
              total: foundUser.earnings.total + Number(levelCredit),
              direct: foundUser.earnings.direct,
              level: foundUser.earnings.level,
              club: foundUser.earnings.club,
              addition: foundUser.earnings.addition + Number(levelCredit),
              addition2: foundUser.earnings.addition2,
              addition3: foundUser.earnings.addition3,
              balance: foundUser.earnings.balance + Number(levelCredit)
            }
          }
        });
      
        const newTransaction = {
          type: 'Credit',
          from: 'Captcha robot',
          amount: Number(levelCredit),
          status: 'success',
          time: {
            date: date,
            month: month,
            year: year
          },
          trnxId: level
        };
      
        let history = foundUser.transaction;
        history.push(newTransaction);
        await User.updateOne({ email: foundUser.email }, { $set: { transaction: history } });
      
        totalAmount += Number(levelCredit);
      }));
      
      const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
      let existingAutobot = foundAdmin.autobot;
      
      const newTransaction = {
        time: {
          date: date,
          month: month,
          year: year
        },
        package: amount,
        users: totalUser,
        amount: totalAmount,
        level: level,
        email:users
      };
      
      existingAutobot.push(newTransaction);
      await Admin.updateOne({ email: process.env.ADMIN }, { $set: { autobot: existingAutobot } });
      
      


      
    } catch (err) {
      console.log(err);
      
    }
    res.redirect('/admin');
  }
});

app.post('/api/clubMemberUpdate', async (req, res)=>{
  if(!req.session.user){
    res.redirect('/');
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      const { member1, member2, member3, member4 } = req.body;

      if (member1 !== member2 && member1 !== member3 && member1 !== member4 &&
          member2 !== member3 && member2 !== member4 &&
          member3 !== member4) {
        // Values are unique
          await User.updateOne({email:foundUser.email}, {$set:{
          club:{
            team:{
              member1:member1,
              member2:member2,
              member3:member3,
              member4:member4,
            },
            stage:true
          }
        }});
        res.status(200).send({
          alertType : "success",
          alert : "true",
          message: 'Club members updated successfully'});
      } else {
        // Some values are the same
        res.status(200).send({
          alertType : "warning",
          alert : "true",
          message: 'Members must be unique'});
      }
      
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.post('/unsetBankDetails', async (req, res) => {
  if (!req.session.admin) {
    res.redirect('/adminLogin');
  } else {
    try {
      const foundUser = await User.findOne({ email: req.body.email });
      if (!foundUser) {
        return res.redirect('/admin');
      }

      if (req.body.validation === "CONFIRM") {
        await User.updateOne({ email: req.body.email }, { $unset: { bankDetails: 1 } });
      }

      res.redirect('/admin');
    } catch (err) {
      console.error(err);
      res.redirect('/admin');
    }
  }
});





app.post('/test', async (req, res)=>{
  if(!req.session.user){
    res.redirect('/');
  }else{
    try {
      const foundUser = await User.findOne({email:req.session.user.email});
      let level1 = [];
      let level2 = [];
      let level3 = [];
      let level4 = [];
      let level5 = [];
      let level6 = [];
      
      //Push the club members to array 
        if(foundUser.club.stage == true){
          const team = {
            team1: foundUser.club.team.member1,
            team2: foundUser.club.team.member2,
            team3: foundUser.club.team.member3,
            team4: foundUser.club.team.member4,
          }
          const team1 = await User.findOne({userID:team.team1});
          level1.push(team1);
          const team2 = await User.findOne({userID:team.team2});
          level1.push(team2);
          const team3 = await User.findOne({userID:team.team3});
          level1.push(team3);
          const team4 = await User.findOne({userID:team.team4});
          level1.push(team4);

          //Push Level 1 club members to level 2
          level1.forEach(async(member)=>{

            if(member.club.stage == true){

              const level1Team = {
                team1: member.club.team.member1,
                team2: member.club.team.member2,
                team3: member.club.team.member3,
                team4: member.club.team.member4,
              }
              const level1Team1 = await User.findOne({userID:level1Team.team1});
              level2.push(level1Team1);
              const level1Team2 = await User.findOne({userID:level1Team.team2});
              level2.push(level1Team2);
              const level1Team3 = await User.findOne({userID:level1Team.team3});
              level2.push(level1Team3);
              const level1Team4 = await User.findOne({userID:level1Team.team4});
              level2.push(level1Team4);
              
            }
          });

          //Push Level 2 club members to level 3
          level2.forEach(async(member)=>{

            if(member.club.stage == true){

              const level2Team = {
                team1: member.club.team.member1,
                team2: member.club.team.member2,
                team3: member.club.team.member3,
                team4: member.club.team.member4,
              }
              const level2Team1 = await User.findOne({userID:level2Team.team1});
              level3.push(level2Team1);
              const level2Team2 = await User.findOne({userID:level2Team.team2});
              level3.push(level2Team2);
              const level2Team3 = await User.findOne({userID:level2Team.team3});
              level3.push(level2Team3);
              const level2Team4 = await User.findOne({userID:level2Team.team4});
              level3.push(level2Team4);
              
            }
          });

          //Push Level 3 club members to level 4
          level3.forEach(async(member)=>{

            if(member.club.stage == true){

              const level3Team = {
                team1: member.club.team.member1,
                team2: member.club.team.member2,
                team3: member.club.team.member3,
                team4: member.club.team.member4,
              }
              const level3Team1 = await User.findOne({userID:level3Team.team1});
              level4.push(level3Team1);
              const level3Team2 = await User.findOne({userID:level3Team.team2});
              level4.push(level3Team2);
              const level3Team3 = await User.findOne({userID:level3Team.team3});
              level4.push(level3Team3);
              const level3Team4 = await User.findOne({userID:level3Team.team4});
              level4.push(level3Team4);
              
            }
          });

          //Push Level 4 club members to level 5
          level4.forEach(async(member)=>{

            if(member.club.stage == true){

              const level4Team = {
                team1: member.club.team.member1,
                team2: member.club.team.member2,
                team3: member.club.team.member3,
                team4: member.club.team.member4,
              }
              const level4Team1 = await User.findOne({userID:level4Team.team1});
              level5.push(level4Team1);
              const level4Team2 = await User.findOne({userID:level4Team.team2});
              level5.push(level4Team2);
              const level4Team3 = await User.findOne({userID:level4Team.team3});
              level5.push(level4Team3);
              const level4Team4 = await User.findOne({userID:level4Team.team4});
              level5.push(level4Team4);
              
            }
          });

          //Push Level 5 club members to level 6
          level5.forEach(async(member)=>{

            if(member.club.stage == true){

              const level5Team = {
                team1: member.club.team.member1,
                team2: member.club.team.member2,
                team3: member.club.team.member3,
                team4: member.club.team.member4,
              }
              const level5Team1 = await User.findOne({userID:level5Team.team1});
              level6.push(level5Team1);
              const level5Team2 = await User.findOne({userID:level5Team.team2});
              level6.push(level5Team2);
              const level5Team3 = await User.findOne({userID:level5Team.team3});
              level6.push(level5Team3);
              const level5Team4 = await User.findOne({userID:level5Team.team4});
              level6.push(level5Team4);
              
            }
          });


        }

    } catch (err) {
      console.log(err);
      
    }
  }
});




app.listen(process.env.PORT || 3001, function() {
  console.log("Server started on port 3001 | http://localhost:3001");
});
