cmake_minimum_required(VERSION 3.22.1)

# Define the library name here.
project(appmodules)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Add FFmpeg include/lib paths
set(ffmpeg_dir ${CMAKE_SOURCE_DIR}/../ffmpeg-android-maker/output)
set (ffmpeg_libs ${ffmpeg_dir}/lib/${ANDROID_ABI}) 
include_directories(${ffmpeg_dir}/include/${ANDROID_ABI})

set(ffmpeg_libs_names avcodec avdevice avfilter avformat avutil swresample swscale) 
foreach(lib ${ffmpeg_libs_names})
    add_library(${lib} SHARED IMPORTED)
    set_target_properties (${lib} PROPERTIES IMPORTED_LOCATION ${ffmpeg_libs}/lib${lib}.so)
endforeach()

target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeFFmpegModule.cpp)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)

target_link_libraries (${CMAKE_PROJECT_NAME} 
    log jnigraphics ${ffmpeg_libs_names})