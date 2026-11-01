TinyCC (Tiny C Compiler) 0.9.27, win64 build, unchanged.
Source and downloads: https://bellard.org/tcc/ and https://download.savannah.gnu.org/releases/tinycc/
(tcc-0.9.27-win64-bin.zip, sha256 34a721949a2583fdff725312da092fa0f5f1f284b702e6f811c6954714faabb2)
Licence: GNU Lesser General Public License 2.1 (https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).

Max Code uses it only to compile C code it is checking (tcc -c, never linked or run), so it can tell
for certain whether the code compiles. Only tcc.exe, libtcc.dll, include/ and lib/ are included.
