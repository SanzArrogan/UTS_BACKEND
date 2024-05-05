 // Import modules
 const express = require('express');
 const mongoose = require('mongoose');
 const bodyParser = require('body-parser');
 const bcrypt = require('bcrypt');
 const app = express();
 const port = 3001;
 
 // Connect to MongoDB
 mongoose.connect('mongodb://localhost:27017/PITCHER')
   .then(() => console.log('Connected to MongoDB'))
   .catch(err => console.error('Failed to connect to MongoDB:', err));
 
 // Define MongoDB schema for pitcher data
 const pitcherSchema = new mongoose.Schema({
     name: String,
     phone: String,
     idea: String,
     funding: String
 });
 
 // Define MongoDB model for pitcher data
 const Pitcher = mongoose.model('Pitcher', pitcherSchema);
 // Define User Schema and Model
 const userSchema = new mongoose.Schema({
     username: {
         type: String,
         required: true,
     },
     password: {
         type: String,
         required: true
     }
 });
 
 const User = mongoose.model("User", userSchema);

 // Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Ensure JSON parsing if needed
app.use(express.static('public'));
app.set('view engine', 'ejs');

 
 // Function to format number to Indonesian Rupiah
 function formatRupiah(number) {
     return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
 }
 
 // Route to handle form submission for pitcher
 app.post('/submit_pitcher', (req, res) => {
     const { name, phone, idea, funding } = req.body;
 
     // Add country code prefix "+62" to the phone number
     const formattedPhone = "+62" + phone;
 
     // Parsing funding to number and formatting it to Indonesian Rupiah
     const formattedFunding = formatRupiah(parseInt(funding));
 
     // Create a new pitcher object
     const newPitcher = new Pitcher({
         name,
         phone: formattedPhone,
         idea,
         funding: formattedFunding
     });
 
     // Save data to MongoDB
     newPitcher.save()
         .then(() => {
             res.redirect('/pitcher');
         })
         .catch(err => {
             console.error('Failed to save pitcher data:', err);
             res.redirect('/pitcher');
         });
 });
 
 // Route to handle removal of pitcher data
 app.delete('/remove_pitcher/:id', (req, res) => {
     const pitcherId = req.params.id;
 
     // Remove the pitcher data from the database
     Pitcher.findOneAndDelete({ _id: pitcherId })
         .then(() => {
             res.json({ message: 'Pitcher data successfully removed.' });
         })
         .catch(err => {
             console.error('Failed to remove pitcher data:', err);
             res.status(500).json({ message: 'Failed to remove pitcher data.' });
         });
 });
 
 // Route to render the investor page
 app.get('/investor', (req, res) => {
     Pitcher.find({})
         .then(pitchers => {
             res.render('investor', { pitchers: pitchers }); // Melewatkan data pitchers saat merender halaman investor.ejs
         })
         .catch(err => {
             console.error('Failed to fetch pitcher data:', err);
             res.render('investor', { errorMessage: 'Failed to fetch pitcher data.' });
         });
 });
 
 
 
 // Set view engine to EJS
 app.set('view engine', 'ejs');
 
 // Serve static files from the 'public' directory
 app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
 
 // Route for login page
app.get('/', (req, res) => {
    // Pastikan tidak ada errorMessage yang dikirim secara default
    res.render('login', { errorMessage: null });
});
 
 // Login User
 app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            // Kirim pesan error kembali ke halaman login
            return res.render("login", { errorMessage: "Incorrect username or password." });
        }

        // Jika autentikasi berhasil, tampilkan halaman utama
        res.render("main");
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).render("login", { errorMessage: "An error occurred during login." });
    }
});

 
 // Signup Route
 app.get('/signup', (req, res) => {
     res.render('signup');
 });
 
 // Register User
 
 app.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already in use. Please choose a different username.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();
        // Kirim respons sukses
        res.json({ success: true, message: 'User registered successfully!' });
        res.render("login");
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: 'Error registering new user.' });
    }
});



 // Route for main page
 app.get('/main', (req, res) => {
     res.render('main');
 });    
 
 // Route for pitcher page
 app.get('/pitcher', (req, res) => {
     res.render('pitcher');
 });
 
 // Route to handle payment verification
 app.post('/verify_payment/:id', (req, res) => {
     const pitcherId = req.params.id;
     const { payAmount } = req.body;
 
     Pitcher.findById(pitcherId)
         .then(pitcher => {
             const pitcherFunding = parseInt(pitcher.funding.replace(/\D/g, '')); // Remove non-numeric characters from funding
             const payment = parseInt(payAmount);
 
             if (payment >= (pitcherFunding * 0.5)) { // Check if payment is equal to or greater than 50% of funding
                 res.json({ message: 'Payment verified. Pitcher marked as paid.' });
             } else {
                 res.status(400).json({ message: 'Payment is less than 50% of the funding.' });
             }
         })
         .catch(err => {
             console.error('Failed to verify payment:', err);
             res.status(500).json({ message: 'Failed to verify payment.' });
         });
 });
 
 // Start the server
 app.listen(port, () => {
     console.log(`Server is running on http://localhost:${port}`);
 });