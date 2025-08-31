const { withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

async function modifyBuildGradle(buildGradle) {
    const newContent = `
    // FFmpeg configuration
    android {
        packagingOptions {
            pickFirst 'lib/x86/libc++_shared.so'
            pickFirst 'lib/x86_64/libc++_shared.so'
            pickFirst 'lib/armeabi-v7a/libc++_shared.so'
            pickFirst 'lib/arm64-v8a/libc++_shared.so'
        }
    }
    
    dependencies {
        implementation 'com.arthenica:mobile-ffmpeg-full:4.4'
    }
  `;

    return mergeContents({
        tag: 'ffmpeg-config',
        src: buildGradle,
        newSrc: newContent,
        anchor: /apply plugin: "com.android.application"/,
        offset: 1,
        comment: '//',
    }).contents;
}

const withFFmpegAndroid = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'app/build.gradle');
            const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
            const newBuildGradle = await modifyBuildGradle(buildGradle);
            fs.writeFileSync(buildGradlePath, newBuildGradle);
            return config;
        },
    ]);
};

const withFFmpegIOS = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            const podfile = fs.readFileSync(podfilePath, 'utf8');
            const newPodfile = podfile.replace(
                /platform :ios.+$/m,
                `$&\npod 'mobile-ffmpeg-full', '~> 4.4'`
            );
            fs.writeFileSync(podfilePath, newPodfile);
            return config;
        },
    ]);
};

module.exports = (config) => {
    config = withFFmpegAndroid(config);
    config = withFFmpegIOS(config);
    return config;
};
