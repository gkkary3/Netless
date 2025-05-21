const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("../models/users.model");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;

// req.login(user)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// client => session => request
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
}); // req.user = user;

const localStrategyConfig = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return done(null, false, { msg: `Email ${email} not found` });
      }

      user.comparePassword(password, (err, isMatch) => {
        if (err) return done(err);

        if (isMatch) return done(null, user);

        return done(null, false, { msg: "Invalid email or password." });
      });
    } catch (err) {
      return done(err);
    }
  }
);

passport.use("local", localStrategyConfig);

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const googleStrategyConfig = new GoogleStrategy(
  {
    clientID: googleClientID,
    clientSecret: googleClientSecret,
    callbackURL: "/auth/google/callback",
    scope: ["email", "profile"],
  },

  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ googleId: profile.id });

      if (existingUser) {
        return done(null, existingUser);
      }

      const user = new User();
      user.email = profile.emails[0].value;
      user.googleId = profile.id;
      user.username = profile.displayName;
      user.firstName = profile.name.givenName;
      user.lastName = profile.name.familyName;

      await user.save();
      done(null, user);
    } catch (err) {
      console.log(err);
      done(err);
    }
  }
);

passport.use("google", googleStrategyConfig);

const kakaoClientID = process.env.KAKAO_CLIENT_ID;
const kakaoStrategyConfig = new KakaoStrategy(
  {
    clientID: kakaoClientID,
    callbackURL: "/auth/kakao/callback",
  },

  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ kakaoId: profile.id });

      if (existingUser) {
        if (
          !existingUser.profileImage &&
          profile._json.properties.profile_image
        ) {
          existingUser.profileImage = profile._json.properties.profile_image;
          await existingUser.save();
        }
        return done(null, existingUser);
      }

      const user = new User();
      user.email = profile._json.kakao_account.email;
      user.kakaoId = profile.id;
      user.username =
        profile._json.properties.nickname || `Kakao_${profile.id}`;

      if (profile._json.properties.profile_image) {
        user.profileImage = profile._json.properties.profile_image;
      }

      await user.save();
      done(null, user);
    } catch (err) {
      console.log(err);
      done(err);
    }
  }
);
passport.use("kakao", kakaoStrategyConfig);
