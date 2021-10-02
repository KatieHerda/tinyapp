const express = require('express');
const cookieSession = require('cookie-session');
const { reset } = require('nodemon');
const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('./helpers');
const app = express();
const PORT = 8080;

//tells express app to use EJS as its templating engine
app.set('view engine', 'ejs');

// //URL DATABASE AND USER DATABASE
const urlDatabase = {
  'b2xVn2': {
    longURL: 'http://www.lighthouselabs.ca',
    userID: 'A1234'
  },
  '9sm5xK': {
    longURL: 'http://www.lighthouselabs.ca',
    userID: 'A4567'
  }
};

const users = {
  A1234: {
    id: "A1234",
    email: "katie@coolkids.com",
    password: bcrypt.hashSync("abcd", 10)
  },
  A4567: {
    id: "A4567",
    email: "artur@coolkids.com",
    password: bcrypt.hashSync("efgh", 10)
  }
};

// //MIDDLEWARE
// body parser library will convert the request body from buffer into readable string
app.use(express.urlencoded({ extended: false }));

app.use(cookieSession({
  name: 'session',
  keys: ['secretKeyOne', 'secretkeyTwo'],
}));

// //FUNCTIONS
//generate a random shortURL (string)
const generateRandomString = () => {
  return Math.random().toString(36).substr(2, 6);
};

// //APP.POST
//recieves form submission and creates a new key:value pair in obj
app.post('/urls', (req, res) => {
  const userID = req.session.user_id;
  let generatedShortURL = generateRandomString();
  urlDatabase[generatedShortURL] = {longURL: req.body.longURL, userID: userID};

  if (!users[userID]) {
    return res.send('Must be logged in to create a new short URL\n');
  } 
  
  res.redirect(`/urls/${generatedShortURL}`);
});

//add post request to delete a short URL and redirect to the /urls page
app.post('/urls/:shortURL/delete', (req, res) => {
  const shortURL = req.params.shortURL;
  const userID = req.session.user_id;

  //for a given user, if the URL is not in their given array, do not allow delete
  if (!userID) {
    res.send('Please login before continuing\n');
  }

  const user = users[userID];
  if (!user) {
    //If the short URL exists but user who owns it is not logged in.
    return res.send('Invalid user, please log in.');
    //does user id match the id that's associated with the short URL
  }
  
  //If the URL does not exist
  const url = urlDatabase[shortURL];
  if (!url) {
    return res.send('Invalid short URL.');
  }
  
  //Does the URL belong to the user?
  if (url.userID !== userID) {
    return res.send('This URL does not belong to you.');
  }

  delete urlDatabase[shortURL];
  res.redirect('/urls');
});

//add post request to edit a short URL and redirect to the /urls page
app.post('/urls/:id', (req, res) => {
  const shortURL = req.params.id;
  const userID = req.session.user_id;
  //const urlOwner = urlDatabase[key].userID; //Returns array of URLs for given user

  //for a given user, if the URL is not in their given array, do not allow edit
  if (!userID) {
    res.send('Please login before continuing\n');
    return;
  }

  const user = users[userID];
  if (!user) {
    //If the short URL exists but user who owns it is not logged in.
    return res.send('Invalid user, please log in.');
  }
  
  //If the URL does not exist
  const url = urlDatabase[shortURL];
  if (!url) {
    return res.send('Invalid short URL.');
  }
  
  //Does the URL belong to the user?
  if (url.userID !== userID) {
    return res.send('This URL does not belong to you.');
  }

  const newURL = req.body.longURL;
  urlDatabase[shortURL].longURL = newURL;
  res.redirect('/urls');
});

//add post request for login that will track cookies
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userID = findUserByEmail(email, users);
 

  //If email / password are empty strings
  if (!email || !password) {
    return res.status(400).send('email or password cannot be blank');
  }

  //If email not found
  if (!userID) {
    return res.status(403).send('email not found');
  }

  const doPasswordsMatch = bcrypt.compareSync(password, userID.password);

  //If password does not match userID password
  if (!doPasswordsMatch) {
    return res.status(403).send('password does not match');
  }

  req.session.user_id = userID.id;
  res.redirect('/urls');
});

//add post request to logout
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//add post request for register that will track cookies
app.post('/register', (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = findUserByEmail(email, users);

  
  users[id] = {
    id,
    email,
    //assigned hashed password to password key
    password : hashedPassword
  };
  
  //If email / password are empty strings
  if (!email || !password) {
    return res.status(400).send('email or password cannot be blank');
  }
  
  //If someone tries to register with email that already exists
  if (user) {
    return res.status(400).send('user with that email already exists');
  }

  req.session.user_id = users[id].id;
  res.redirect('/urls');
});

// //APP.GET
//renders the urls_new template in browser, presents the form to the user.
app.get('/urls/new', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID]};

  //If no user, redirect them to login
  if (!users[userID]) {
    return res.redirect('/login');
  }
  
  res.render('urls_new', templateVars);
});

//renders the urls_show template in browser, presents the form to the user.
app.get('/urls/show', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { urls: urlDatabase, user: users[userID]};
 
  res.render('urls_show', templateVars);
});

//renders the register template in browser, presents the form to the user.
app.get('/register', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID]};

  if (userID) {
    return res.redirect('/urls');
  }

  res.render('register', templateVars);
});

//renders the login template in browser, presents the form to the user.
app.get('/login', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };

  if (userID) {
    return res.redirect('/urls');
  }
  res.render('login', templateVars);
});

//the value in this part of the URL will be available in the req.params obj
//shortURL and longURL are passed to the template in a templateVars obj
app.get('/urls/:shortURL', (req, res) => {
  const userID = req.session.user_id;
  const shortURL = req.params.shortURL;
 
  
  if (!urlDatabase[shortURL]) {
    return res.send('Invalid URL. Please enter a valid short URL.');
  }
  
  const user = users[userID];
  if (!user) {
    //res.render('urls_unauthorized', templateVars);
    return res.send('Invalid user, please log in.');
    //does user id match the id that's associated with the short URL
  }
  
  const url = urlDatabase[shortURL];
  if (!url) {
    return res.send('Invalid short URL.');
  }

  //Does the URL belong to the user?
  if (url.userID !== userID) {
    return res.send('This URL does not belong to you.');
  }
  
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[userID]};
  res.render('urls_show', templateVars);

});

//when the shortURL is clicked on, it redirects to actual website.
app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;

  if (!urlDatabase[shortURL]) {
    return res.send('Short URL does not exist!');
  }

  let longURL = urlDatabase[req.params.shortURL].longURL;

  if (longURL === undefined) {
    return res.send('This URL does not exist!');
  }
  
  //determine if long URL contains http:// we're not doubling up.
  if (!longURL.includes('http://')) {
    longURL = 'http://' + longURL;
  }
  res.redirect(longURL);
});

//urls route that uses res.render to pass URL data to the template
app.get('/urls', (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];
  const templateVars = { urls: urlDatabase, user: users[userID], userID };

  if (!user) {
    //return html if user attempting to get
    return res.render('urls_unauthorized', templateVars);
  }
  
  res.render('urls_index', templateVars);

});

//Root path
app.get('/', (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];

  if (!user) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

// //LISTEN ON PORT
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});