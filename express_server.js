const express = require('express');
const app = express();
const PORT = 8080;

//tells express app to use EJS as its templating engine
app.set('view engine', 'ejs');

const urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

// when browser submits a post request, the data in body is sent as buffer, not readable 
// a body parser library will convert the request body from buffer into readable string
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

//generate a random shortURL (string)
const generateRandomString = () => {
  return Math.random().toString(36).substr(2, 6);
};

//recieves form submission and creates a new key:value pair in obj
//shortURL:longUR
//redirected to shortURL section
app.post('/urls', (req, res) => {
  let generatedShortURL = generateRandomString();
  urlDatabase[generatedShortURL] = req.body.longURL;
  res.redirect(`/urls/${generatedShortURL}`);
});

//add post request to delete a short URL and redirect to the /urls page
app.post('/urls/:shortURL/delete', (req, res) => {
  const key = req.params.shortURL;

  delete urlDatabase[key];
  res.redirect('/urls');
})

//add post request to edit a short URL and redirect to the /urls page
app.post('/urls/:shortURL/edit', (req, res) => {
  const key = req.params.shortURL;
  const newURL = req.body.longURL;

  urlDatabase[key] = newURL;

  res.redirect('/urls');
})

//renders the urls_new template in browser, presents the form to the user.
//needs to be before the get /urls/:id
app.get('/urls/new', (req, res) => {
  res.render('urls_new');
});

// : indicates that shortURL is a route paramater
//the value in this part of the URL will be available in the req.params obj
//both the shortURL and longURL are passed to the template in a templateVars obj
app.get('/urls/:shortURL', (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]};
  res.render('urls_show', templateVars);
});

//when the shortURL is clicked on, it redirects to actual website.
app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];

  // //Edge Case: redirect shortURLs that are nonexistant
  // if (res.statusCode !== '302') {
  // // can we alert the user somehow?!
  //   res.redirect('/urls');
  //   }

  //determine if long URL contains http:// we're not doubling up.
  if (longURL.includes('http://')) {
    res.redirect(`${longURL}`);
  } else {
    res.redirect(`http://${longURL}`);
  }

});

//urls route that uses res.render to pass URL data to the template
app.get('/urls', (req, res) => {
  const templateVars = { urls: urlDatabase };
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