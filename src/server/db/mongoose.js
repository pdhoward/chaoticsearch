import mongoose                   from 'mongoose';
import initializeModel            from '../models/Initialize';
import colors                     from 'colors';

module.exports = function (dbURI) {
    mongoose.connect(dbURI);
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error...'.red));
    db.once('open', function callback() {
        initializeModel.createDefaultChannel();
        console.log('MongoDB Connected'.green);
    });

};
