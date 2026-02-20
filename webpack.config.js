const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);

// List of node_modules that need to be transpiled by babel
const compileNodeModules = [
    'react-native-reanimated',
    'react-native-gesture-handler',
    'react-native-screens',
    'react-native-safe-area-context',
    '@react-navigation',
    '@react-native-async-storage',
    'react-native-url-polyfill',
    'react-native-vector-icons',
    'react-native-keyboard-aware-scroll-view',
    '@shopify/flash-list',
    'react-native-worklets',
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));

// Babel loader configuration
const babelLoaderConfiguration = {
    test: /\.(ts|tsx|js|jsx|mjs)$/,
    include: [
        path.resolve(appDirectory, 'index.web.js'),
        path.resolve(appDirectory, 'App.tsx'),
        path.resolve(appDirectory, 'src'),
        ...compileNodeModules,
    ],
    use: {
        loader: 'babel-loader',
        options: {
            cacheDirectory: false,
            presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
            ],
            plugins: [
                // 'react-native-reanimated/plugin', // Disabled since we are mocking reanimated
                'react-native-web',
                ['@babel/plugin-proposal-class-properties', { loose: true }],
                ['@babel/plugin-proposal-private-methods', { loose: true }],
                ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
            ],
        },
    },
};

// Image loader
const imageLoaderConfiguration = {
    test: /\.(gif|jpe?g|png|svg)$/,
    use: {
        loader: 'url-loader',
        options: {
            name: '[name].[ext]',
            esModule: false,
        },
    },
};

// Font loader for vector icons
const fontLoaderConfiguration = {
    test: /\.ttf$/,
    loader: 'url-loader',
    include: path.resolve(appDirectory, 'node_modules/react-native-vector-icons'), // Ensure fonts are loaded
};

module.exports = {
    entry: path.resolve(appDirectory, 'index.web.js'),

    output: {
        path: path.resolve(appDirectory, 'dist'),
        filename: 'bundle.[contenthash].js',
        publicPath: '/',
        clean: true,
    },

    module: {
        rules: [
            babelLoaderConfiguration,
            imageLoaderConfiguration,
            fontLoaderConfiguration,
        ],
    },

    resolve: {
        alias: {
            'react-native$': 'react-native-web',
            'react-native-image-picker': path.resolve(appDirectory, 'web/mocks/react-native-image-picker.js'),
            'react-native-gesture-handler': path.resolve(appDirectory, 'web/mocks/react-native-gesture-handler.js'),
            // 'react-native-reanimated': path.resolve(appDirectory, 'web/mocks/react-native-reanimated.js'), // Keep reanimated real for now, try mocking only gesture handler
        },
        extensions: [
            '.web.tsx',
            '.web.ts',
            '.web.js',
            '.web.mjs',
            '.tsx',
            '.ts',
            '.js',
            '.mjs',
            '.json',
        ],
        mainFields: ['browser', 'module', 'main', 'react-native'],
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(appDirectory, 'public/index.html'),
        }),
        new webpack.DefinePlugin({
            __DEV__: JSON.stringify(true),
            'process.env.NODE_ENV': JSON.stringify('development'),
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^react-native-worklets$/,
        }),
    ],

    devServer: {
        port: 8082,
        hot: true, // HMR enabled
        historyApiFallback: true,
        static: {
            directory: path.resolve(appDirectory, 'public'),
        },
        client: {
            overlay: {
                warnings: false,
                errors: true,
            },
        },
    },

    devtool: 'source-map',
};
