var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
        app: './src/js/app/app.js',
        service: './src/js/app/service.js',
        vendor: [
            'jquery',
        ]
    },
    externals: {
        base64: 'Base64',
        inboxsdk: 'InboxSDK',
        mime: 'Mime'
    },
    output: {
        path: path.resolve(__dirname, 'dist/js'),
        filename: '[name].js',
    },
    module: {
        loaders: [
            {
                test: /\.js/,
                exclude: [/node_modules/, /mime-js/],
                loader: 'babel-loader',
            },
        ],
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin(
            {
                name: 'vendor',
                chunks: ['app'],
                filename: 'vendor.js'
            }),
        new webpack.optimize.UglifyJsPlugin()
    ],
};
