//Login form validation and handler
const loginUser = function(){
    userEmail = document.getElementById('userEmail').value;
    userPassword = document.getElementById('userPassword').value;
    if (userEmail == "" || userPassword == "") {
      demo.showNotification('bottom','center', 'warning', 'Enter email and password');
    }else{
      $.ajax({
        url: '/api/login',
        // dataType: "jsonp",
        data: {
          email: document.getElementById("userEmail").value,
          password: document.getElementById("userPassword").value
        },
        type: 'POST',
        success: function (data) {
          if(data.alert == 'true'){
            document.getElementById('alert').innerHTML = `
                <div class="alert `+data.alertType+`">
                    <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                    <p class='text-white'>`+data.message+`</p>
                  </div>`
                  
                  var div = document.getElementById("alert");
                  div.style.opacity = "1";
                  div.style.display = "block";
          }
          if(data.alertType == 'success'){
            dashboard2000();
          }
        },
        error: function (status, error) {
          console.log('Error: ' + error.message);
        }
      });
    }
}


//Register form validation and handler
const registerUser = function(){
    username = document.getElementById('username').value;
    email = document.getElementById('email').value;
    mobile = document.getElementById('mobile').value;
    password = document.getElementById('password').value;
    confirmPassword = document.getElementById('confirmPassword').value;
    sponsorID = document.getElementById('sponsorID').value;
    checkbox = document.getElementById('checkbox');
  
    if (email == "" || password == "" || confirmPassword == "" || sponsorID == "" || username == "" || mobile == "") {
        
        document.getElementById('alert').innerHTML = `
                        <div class="alert warning">
                            <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                            <p class='text-white'>Kindly fill in all the details</p>
                          </div>`
                  
                  var div = document.getElementById("alert");
                  div.style.opacity = "1";
                  div.style.display = "block";
    }else{
      if(checkbox.checked){
        $.ajax({
          url: '/api/register',
          // dataType: "jsonp",
          data: {
            email: email,
            password: password,
            username: username,
            mobile: mobile,
            confirmPassword: confirmPassword,
            sponsorID: sponsorID.toUpperCase()
          },
          type: 'POST',
          success: function (data) {
            if(data.alert == 'true'){

                document.getElementById('alert').innerHTML = `
                <div class="alert `+data.alertType+`">
                    <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                    <p class='text-white'>`+data.message+`</p>
                  </div>`

                  var div = document.getElementById("alert");
                  div.style.opacity = "1";
                  div.style.display = "block";
            }
            if(data.alertType == 'success'){
              login2000();
            }
          },
          error: function (status, error) {
            console.log('Error: ' + error.message);
          },
        });

      }else{
        document.getElementById('alert').innerHTML = `
                <div class="alert danger">
                    <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                    <p class='text-white'>Kindly agree to the terms and conditions</p>
                  </div>`
                  
                  var div = document.getElementById("alert");
                  div.style.opacity = "1";
                  div.style.display = "block";
      }
    }
}

//Check for Sponsor
const sponsorAvailability = function(){
            
    sponsorUser = document.getElementById('sponsorID').value;
    var button = document.getElementById('submit');
    $.ajax({
        url: '/api/checkSponsor',
        data:{
            sponsorID: sponsorUser.toUpperCase()
        },
        type: 'POST',
        success: function(data){
            if(data.sponsor == 'Not found'){
                setTimeout(() => {
                    document.getElementById('sponsorAvailability').innerHTML = `<p class="text-danger">User not found</p>`;
                    button.disabled = true;
                }, 400); // 1 second timeout
                } else {
                setTimeout(() => {
                    document.getElementById('sponsorAvailability').innerHTML = `<p class="text-success">`+data.sponsor+`</p>`;
                    button.disabled = false;
                }, 400); // 1 second timeout
                }

        }
    })
}

//Bank details updation form
const bankDetails = function(){
    holdersName = document.getElementById('holdersName').value
    accountNumber = document.getElementById('accountNumber').value
    bankName = document.getElementById('bankName').value
    ifsc = document.getElementById('ifsc').value
  
    $.ajax({
      url: '/api/bankDetails',
      // dataType: "jsonp",
      data: {
        holdersName: holdersName,
        accountNumber: accountNumber,
        bankName: bankName,
        ifsc: ifsc
      },
      type: 'POST',
      success: function (data) {
        if( data.redirect == undefined){
  
        }else{
          login2000();
        }
        if(data.alert == 'true'){

            document.getElementById('alert').innerHTML = `
            <div class="alert `+data.alertType+`">
                <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                <p class='text-white'>`+data.message+`</p>
              </div>`

              var div = document.getElementById("alert");
              div.style.opacity = "1";
              div.style.display = "block";
        }
        if(data.alertType == 'success'){
          dashboard2000();
        }
      },
      error: function (status, error) {
        console.log('Error: ' + error.message);
      },
    });
  
  
}


//Payment verification
const paymentVerification = function(){

    amount = document.getElementById('amount').value
    trnxId = document.getElementById('trnxId').value
    $.ajax({
      url: '/api/paymentVerification',
      // dataType: "jsonp",
      data: {
        amount: amount,
        trnxId: trnxId
      },
      type: 'POST',
      success: function (data) {
        if( data.redirect == undefined){
          if(data.alert == 'true'){
            
            document.getElementById('alert').innerHTML = `
            <div class="alert `+data.alertType+`">
                <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                <p class='text-white'>`+data.message+`</p>
              </div>`

              var div = document.getElementById("alert");
              div.style.opacity = "1";
              div.style.display = "block";

          }
          if(data.alertType == 'success'){
           dashboard2000();
          }
        }else{
          login2000();
        }
  
      },
      error: function (status, error) {
        console.log('Error: ' + error.message);
      }
    });
}

//Upgrade verification
const upgradeVerification = function(){

  amount = document.getElementById('amount').value
  trnxId = document.getElementById('trnxId').value
  $.ajax({
    url: '/api/upgradeVerification',
    // dataType: "jsonp",
    data: {
      amount: amount,
      trnxId: trnxId
    },
    type: 'POST',
    success: function (data) {
      if( data.redirect == undefined){
        if(data.alert == 'true'){
          
          document.getElementById('alert').innerHTML = `
          <div class="alert `+data.alertType+`">
              <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
              <p class='text-white'>`+data.message+`</p>
            </div>`

            var div = document.getElementById("alert");
            div.style.opacity = "1";
            div.style.display = "block";

        }
        if(data.alertType == 'success'){
         dashboard2000();
        }
      }else{
        login2000();
      }

    },
    error: function (status, error) {
      console.log('Error: ' + error.message);
    }
  });
}

//Withdraw button handler
const withdraw = function(){
    amount = document.getElementById('amount').value
    $.ajax({
      url: '/api/withdrawal',
      // dataType: "jsonp",
      data: {
        amount: amount
      },
      type: 'POST',
      success: function (data) {
        if( data.redirect == undefined){
          const availableBalance = function(){
            if(data.alert == 'true'){

                document.getElementById('alert').innerHTML = `
                <div class="alert `+data.alertType+`">
                    <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                    <p class='text-white'>`+data.message+`</p>
                  </div>`
    
                  var div = document.getElementById("alert");
                  div.style.opacity = "1";
                  div.style.display = "block";
            }
            
            const balances = document.getElementsByClassName('availableBalance');
            for (let i = 0; i < balances.length; i++) {
            balances[i].innerHTML = data.balance;
            }
        }
          $( document ).ready(function() {
              availableBalance();
          });
        }else{
          login2000();
        }
      },
      error: function (status, error) {
          console.log('Error: ' + error.message);
      },
    });
}

//Payment gateway
const paymentGateway = function(event){
  const clickedElement = event.target;
  const amount = clickedElement.getAttribute('name');
  const url = '/planDetails/'+Number(amount);


  $.ajax({
      url: url,
      type: 'GET',
      success:function(data){
          
          if(data.redirect == undefined){
              
              document.getElementById('wallet').innerHTML = 
              `
              <section class="card pull-up">
                  <div class="card-content">
                      <div class="card-body">
                          <div class="col-12">
                              <div class="row">
                                  <div class="col-md-6 col-12 py-1">
                                      <div class="media">
                                          <div class="media-body text-center px-2">
                                              <h3 class="mt-0 text-capitalize">Payment Portal</h3>
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <div class="text-center mb-1">
                                      <span class="text-xs">Scan the QR below</span>
                                  </div>
                                  <div class="text-center">
                                      <img class="text-center scanner_img" id="qrcode" alt="">
                                  </div>
                                  <div class="text-center mt-2">
                                      <span class="text-xs">Or use <span class="text-dark font-weight-bolder  ms-sm-2"> `+data.upiId+` </span> to invest.</span>
                                  </div>
                                  </div>
                                  <div class="col-md-10 col-12">
                                      <form class="form-horizontal form-referral-link row mt-2" action="">
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="amount" id="amount" disabled value="`+data.amount+`"  required="" autofocus="">
                                                  <label for="amount">Plan amount</label>
                                              </fieldset>
                                          </div>
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="trnxId" id="trnxId"  required="" autofocus="">
                                                  <label for="trnxId">UTR or TRN number</label>
                                              </fieldset>
                                          </div>
                                      </form>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <a href="#"name='240' onclick="paymentVerification()" class="btn-gradient-primary my-1 line-height-3">Submit</a>
                                  </div>
                                  <div id="alert">
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>`
          }
      },
      error:function(error){
          console.log(error);
          
      }
});

async function fetchQR() {
const response = await fetch('/generateQR');
const data = await response.json();
document.getElementById('qrcode').src = data.url;
}

fetchQR();
}

//Upgrade gateway
const upgradeGateway = function(event){
  const clickedElement = event.target;
  const amount = clickedElement.getAttribute('name');
  const url = '/planDetails/'+Number(amount);


  $.ajax({
      url: url,
      type: 'GET',
      success:function(data){
          
          if(data.redirect == undefined){
              
              document.getElementById('wallet').innerHTML = 
              `
              <section class="card pull-up">
                  <div class="card-content">
                      <div class="card-body">
                          <div class="col-12">
                              <div class="row">
                                  <div class="col-md-6 col-12 py-1">
                                      <div class="media">
                                          <div class="media-body text-center px-2">
                                              <h3 class="mt-0 text-capitalize">Payment Portal</h3>
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <div class="text-center mb-1">
                                      <span class="text-xs">Scan the QR below</span>
                                  </div>
                                  <div class="text-center">
                                      <img class="text-center scanner_img" id="qrcode" alt="">
                                  </div>
                                  <div class="text-center mt-2">
                                      <span class="text-xs">Or use <span class="text-dark font-weight-bolder  ms-sm-2"> `+data.upiId+` </span> to invest.</span>
                                  </div>
                                  </div>
                                  <div class="col-md-10 col-12">
                                      <form class="form-horizontal form-referral-link row mt-2" action="">
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="amount" id="amount" disabled value="`+data.amount+`"  required="" autofocus="">
                                                  <label for="amount">Plan amount</label>
                                              </fieldset>
                                          </div>
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="trnxId" id="trnxId"  required="" autofocus="">
                                                  <label for="trnxId">UTR or TRN number</label>
                                              </fieldset>
                                          </div>
                                      </form>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <a href="#"name='240' onclick="upgradeVerification()" class="btn-gradient-primary my-1 line-height-3">Submit</a>
                                  </div>
                                  <div id="alert">
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>`
          }
      },
      error:function(error){
          console.log(error);
          
      }
});

async function fetchQR() {
const response = await fetch('/generateQR');
const data = await response.json();
document.getElementById('qrcode').src = data.url;
}

fetchQR();
}

// Daily Task
const dailyTask = function(){
    console.log('I was run');
    
    $.ajax({
        url: '/api/dailyTask',
        type: 'GET',
        success:function(data){
            if(data.redirect == true){
                login2000()
            }else{
              dashboard2000()
            }
        },
        error:function(error){
            console.log(error);
            
        }
    })
}

//Withdraw button handler
const generatePin = function(){
  amount = document.getElementById('amount').value
  $.ajax({
    url: '/api/createPin',
    // dataType: "jsonp",
    data: {
      amount: amount
    },
    type: 'POST',
    success: function (data) {
      if( data.redirect == undefined){
          if(data.alert == 'true'){

            document.getElementById('alert').innerHTML = `
            <div class="alert `+data.alertType+`">
                <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                <p class='text-white'>`+data.message+`</p>
              </div>`

              var div = document.getElementById("alert");
              div.style.opacity = "1";
              div.style.display = "block";
        }
        dashboard2000();
      }else{
        login2000();
      }
    },
    error: function (status, error) {
        console.log('Error: ' + error.message);
    },
  });
}

  











var dashboard2000 = function(){
  setTimeout(function () {
    window.location.href = "/dashboard";
  }, 2000);
}
var login2000 = function(){
  setTimeout(function () {
    window.location.href = "/";
  }, 2000);
}
