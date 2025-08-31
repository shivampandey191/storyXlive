module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Replace react-native-reanimated/plugin with react-native-worklets/plugin
            'react-native-worklets/plugin',
            'expo-router/babel',
            [
                'module-resolver',
                {
                    root: ['.'],
                    alias: {
                        '@': '.',
                    },
                },
            ],
        ],
    };
};
