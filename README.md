Visualization of Paulo's Eyetracker Data
========================================

This code was written to visualize Paulo's data from an eyetracking experiment. It uses the great
visualization library d3.js to show stacked bars in which the color of each segment codes the target
the subject looked at, while its length codes the duration of the fixation. The code has some parts
that are quite specific to the data format, but it should not be too hard to adapt it to other data.

When using Chrome to open the page, you will need to start Chrome from the command line with the
--allow-file-access-from-files option in order to allow loading the data file.

Written by Erik Weitnauer in 2012.
