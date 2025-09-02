# Add FFmpeg include path for the current ABI
include_directories(${CMAKE_SOURCE_DIR}/../ffmpeg-android-maker/output/include/${ANDROID_ABI})
cmake_minimum_required(VERSION 3.22.1)

# Define the library name here.
project(appmodules)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)


target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeFFmpegModule.cpp)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)

link_directories(/Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI})

set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-rpath-link=/Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}")

target_link_libraries (${CMAKE_PROJECT_NAME}
    log jnigraphics
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libavcodec.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libavdevice.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libavfilter.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libavformat.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libavutil.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libswresample.so
    /Users/shivampandey/Documents/Projects/StoryXLive/android/app/src/main/jnilibs/${ANDROID_ABI}/libswscale.so)