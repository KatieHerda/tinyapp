const express = require('express');
const cookieParser = require('cookie-parser');
const { reset } = require('nodemon');
const app = express();
const PORT = 8080;

//tells express app to use EJS as its templating engine
app.set('view engine', 'ejs');


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
    password: "abcd"
  },
  A4567: {
    id: "A4567",
    email: "artur@coolkids.com",
    password: "efgh"
  }
}

// when browser submits a post request, the data in body is sent as buffer, not readable
// a body parser library will convert the request body from buffer into readable string
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//generate a random shortURL (string)
const generateRandomString = () => {
  return Math.random().toString(36).substr(2, 6);
};

//function to find if user exists 
const findUserByEmail = (email) => {
  for (const userID in users) {
    const idOfUser = users[userID]
    if (idOfUser.email === email) {
      return idOfUser;
    }
  }
  return null;
}

//recieves form submission and creates a new key:value pair in obj
//redirected to shortURL section
app.post('/urls', (req, res) => {
  const userID = req.cookies['user_id'];
  let generatedShortURL = generateRandomString();
  urlDatabase[generatedShortURL] = {longURL: req.body.longURL, userID: userID};

  if (!users[userID]) {
    res.send('Must be logged in to create a new short URL\n')
  } else {
    res.redirect(`/urls/${generatedShortURL}`);
  }
  
});

//add post request to delete a short URL and redirect to the /urls page
app.post('/urls/:shortURL/delete', (req, res) => {
  const key = req.params.shortURL;

  delete urlDatabase[key];
  res.redirect('/urls');
});

//add post request to edit a short URL and redirect to the /urls page
app.post('/urls/:shortURL/edit', (req, res) => {
  const key = req.params.shortURL;
  const newURL = req.body.longURL;

  urlDatabase[key].longURL = newURL;
  res.redirect('/urls');
});

//add post request for login that will track cookies.
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userID = findUserByEmail(email);

  //If email / password are empty strings   
  if (!email || !password) {
    return res.status(400).send('email or password cannot be blank');
  }

  if (!userID) {
    return res.status(403).send('email not found');
  }

  if (userID.password !== password) {
    return res.status(403).send('password does not match');
  }

  res.cookie('user_id', userID.id);
  res.redirect('/urls');
});

//add post request to logout
app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.post('/register', (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const user = findUserByEmail(email);

  users[id] = { 
    id, 
    email, 
    password 
  };

  //If email / password are empty strings   
  if (!email || !password) {
    return res.status(400).send('email or password cannot be blank');
  }
  
  //If someone tries to register with email that already exists
  if (user) {
    return res.status(400).send('user with that email already exists');
  }

  res.cookie('user_id', users[id].id)
  res.redirect('/urls')
});


//renders the urls_new template in browser, presents the form to the user.
//needs to be before the get /urls/:id
app.get('/urls/new', (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = { user: users[userID]};

  
  if (!users[userID]) {
    res.redirect('/login')
  } else {
    res.render('urls_new', templateVars);
  }
});

app.get('/urls/show', (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = { urls: urlDatabase, user: users[userID]};
 
  res.render('urls_show', templateVars);
});

app.get('/register', (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = { user: users[userID]};

  res.render('register', templateVars);
});

app.get('/login', (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = { user: users[userID] };

  res.render('login', templateVars);
})

// : indicates that shortURL is a route paramater
//the value in this part of the URL will be available in the req.params obj
//shortURL and longURL are passed to the template in a templateVars obj
app.get('/urls/:shortURL', (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[userID]};
  res.render('urls_show', templateVars);
});

//when the shortURL is clicked on, it redirects to actual website.
app.get('/u/:shortURL', (req, res) => {
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
  const userID = req.cookies['user_id'];
  const templateVars = { urls: urlDatabase, user: users[userID]};
  res.render('urls_index', templateVars);
});

//Root path
app.get('/', (req, res) => {
  res.send('Hello!');
});

//JSON string representing entire urlDatabase obj
app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

//Repsponse that contains HTML code, rendered in client browser
app.get('/hello', (req, res) => {
  res.send('<html><body>Hello <b>World</b></body></html>\n');
});

//prints a message to terminal once connection established to port
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});