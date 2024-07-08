const LocalStorage = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize(passport, getUserByName, getUserById) {

    const authenticateUser = async (name, password, done) => {
        const user = await getUserByName(name)
        if (user === null) {
            return done(null, false, { message: 'No user with that name'})
        }

        try {
            //console.log(user)
            if (await bcrypt.compare(password, user.password)) {

            } else {
                return done(null, false, { message: "Password incorrect"})
            }
        } catch (error) {
            return done(error)
        }
    }

    passport.use(new LocalStorage({ usernameField: 'name'}, authenticateUser))
    passport.serializeUser((user, done) => {
        console.log("#######---------")
        done(null, user.id);
    });
    
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id);
            if (!user) {
                return done(new Error('User not found'), null);
            }
            console.log("---------")
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }); 
}

module.exports = initialize