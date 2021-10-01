const express = require('express');
const cookieSession = require('cookie-session')
const { reset } = require('nodemon');
const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('./helpers')
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
// when browser submits a post request, the data in body is sent as buffer, not readable
// a body parser library will convert the request body from buffer into readable string
app.use(express.urlencoded({ extended: false }));

app.use(cookieSession({
  name: 'session',
  keys: ['secretKeyOne', 'secretkeyTwo'],
}))

// //FUNCTIONS
//generate a random shortURL (string)
const generateRandomString = () => {
  return Math.random().toString(36).substr(2, 6);
};

//function that returns URLs for a given user ID
const urlsForUser = (id) => {
  let userURLsArr = [];
  for (const shortU in urlDatabase) {
    if (id === urlDatabase[shortU].userID) {
      userURLsArr.push(urlDatabase[shortU]);
    }
  }
  return userURLsArr;
};

// //APP.POST
//recieves form submission and creates a new key:value pair in obj
//redirected to shortURL section
app.post('/urls', (req, res) => {
  const userID = req.session.user_id;
  let generatedShortURL = generateRandomString();
  urlDatabase[generatedShortURL] = {longURL: req.body.longURL, userID: userID};

  if (!users[userID]) {
    res.send('Must be logged in to create a new short URL\n');
  } else {
    res.redirect(`/urls/${generatedShortURL}`);
  }
  
});

//add post request to delete a short URL and redirect to the /urls page
app.post('/urls/:shortURL/delete', (req, res) => {
  const key = req.params.shortURL;
  const userID = req.session.user_id;
  console.log(userID);
  const urlOwner = urlDatabase[key].userID; //Returns array of URLs for given user


  //for a given user, if the URL is not in their given array, do not allow delete
  if (!userID) {
    res.send('Please login before continuing\n');
  }

  for (const urlObject of urlsForUser(userID)) {
    //if given ID and ID in object match, allow deletion
    if (urlObject.userID === urlOwner) {
      delete urlDatabase[key];
      res.redirect('/urls');
      return;
    }
  }
});

//add post request to edit a short URL and redirect to the /urls page
app.post('/urls/:shortURL/edit', (req, res) => {
  const key = req.params.shortURL;
  const userID = req.session.user_id;
  const urlOwner = urlDatabase[key].userID; //Returns array of URLs for given user

  //for a given user, if the URL is not in their given array, do not allow edit

  if (!userID) {
    res.send('Please login before continuing\n');
    return;
  }

  for (const urlObject of urlsForUser(userID)) {
    if (urlObject.userID === urlOwner) {
      const newURL = req.body.longURL;
      urlDatabase[key].longURL = newURL;
      res.redirect('/urls');
      return;
    }
  }
});

//add post request for login that will track cookies.
app.post('/login', (req, res) => {
  const email = req.body.email;
  //input password
  const password = req.body.password;
  const userID = findUserByEmail(email, users);
  const doPasswordsMatch = bcrypt.compareSync(password, userID.password);

  //If email / password are empty strings
  if (!email || !password) {
    return res.status(400).send('email or password cannot be blank');
  }

  if (!userID) {
    return res.status(403).send('email not found');
  }
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

app.post('/register', (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = findUserByEmail(email, users);

  //assigned hashed password to password key
  users[id] = {
    id,
    email,
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
//needs to be before the get /urls/:id
app.get('/urls/new', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID]};

  
  if (!users[userID]) {
    res.redirect('/login');
  } else {
    res.render('urls_new', templateVars);
  }
});

app.get('/urls/show', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { urls: urlDatabase, user: users[userID]};
 
  res.render('urls_show', templateVars);
});

app.get('/register', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID]};

  res.render('register', templateVars);
});

app.get('/login', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };

  res.render('login', templateVars);
});

//the value in this part of the URL will be available in the req.params obj
//shortURL and longURL are passed to the template in a templateVars obj
app.get('/urls/:shortURL', (req, res) => {
  const userID = req.session.user_id;
  const shortU = req.params.shortURL;
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[userID]};

  if (!users[userID]) {
    res.render('urls_unauthorized', templateVars);
    //does user id match the id that's associated with the short URL
  } else if (userID !== urlDatabase[shortU].userID) {
    res.send('This short URL does not belong to you!');
  } else {
    res.render('urls_show', templateVars);
  }
});

//when the shortURL is clicked on, it redirects to actual website.
app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;

  if (!urlDatabase[shortURL]) {
    res.send('Short URL does not exist!');
  }

  const longURL = urlDatabase[req.params.shortURL].longURL;
  //determine if long URL contains http:// we're not doubling up.
  if (longURL.includes('http://')) {
    res.redirect(`${longURL}`);
  } else {
    res.redirect(`http://${longURL}`);
  }
});

//urls route that uses res.render to pass URL data to the template
app.get('/urls', (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];
  const templateVars = { urls: urlDatabase, user: users[userID], userID };

  if (!user) {
      //return html if user attempting to get
    res.render('urls_unauthorized', templateVars);
  } else {
    res.render('urls_index', templateVars);
  }
});

//Root path
app.get('/', (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];

  if(!user) {
    return res.redirect('/login');
  } 
  res.redirect('/urls')
});

// //LISTEN ON PORT
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});