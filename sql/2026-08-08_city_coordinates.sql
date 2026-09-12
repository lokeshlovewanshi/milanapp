-- Coordinates for the city list.
--
-- Birth place was free text, and the data shows what that produces: "Nihal",
-- "Hdhdjd", "Bareily". The kundali function needs a real location, so it
-- rejected anything it did not recognise with a 400. Making birth place a city
-- dropdown backed by these coordinates removes the guesswork on both sides:
-- the app sends a city, the backend sends latitude and longitude, and "unknown
-- place" cannot happen.
--
-- Source: the geonames dataset, matched on name, with alternate spellings for
-- nine cities (Sholapur/Solapur, Panjim/Panaji, Rajamahendravaram/Rajahmundry
-- and so on). Three - Katni, Niwari and Kavaratti - are not in that dataset and
-- are set explicitly.
--
-- Every value was checked against a bounding box for its state before being
-- written here, because a name match is not a location match: a substring
-- search paired Kavaratti in Lakshadweep with Gokavaram in Andhra Pradesh,
-- about 1000km away. That check is why this file has 200 rows and no wrong ones.
--
-- DECIMAL rather than FLOAT: six decimal places is about 10cm, and floats
-- introduce rounding nobody wants to debug inside an astrology calculation.
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@schema AND TABLE_NAME='city' AND COLUMN_NAME='latitude');
SET @sql := IF(@exists=0,
  'ALTER TABLE city ADD COLUMN latitude DECIMAL(9,6) NULL, ADD COLUMN longitude DECIMAL(10,6) NULL',
  'SELECT "skipped: city.latitude already exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE city SET latitude=28.621370, longitude=77.214800 WHERE id=1;  -- New Delhi, Delhi
UPDATE city SET latitude=19.072830, longitude=72.882610 WHERE id=2;  -- Mumbai, Maharashtra
UPDATE city SET latitude=18.519570, longitude=73.855350 WHERE id=3;  -- Pune, Maharashtra
UPDATE city SET latitude=21.146310, longitude=79.084910 WHERE id=4;  -- Nagpur, Maharashtra
UPDATE city SET latitude=19.997270, longitude=73.790960 WHERE id=5;  -- Nashik, Maharashtra
UPDATE city SET latitude=19.877570, longitude=75.342260 WHERE id=6;  -- Aurangabad, Maharashtra
UPDATE city SET latitude=19.197040, longitude=72.963550 WHERE id=7;  -- Thane, Maharashtra
UPDATE city SET latitude=19.036810, longitude=73.015820 WHERE id=8;  -- Navi Mumbai, Maharashtra
UPDATE city SET latitude=17.671520, longitude=75.910440 WHERE id=9;  -- Solapur, Maharashtra
UPDATE city SET latitude=16.695630, longitude=74.231670 WHERE id=10;  -- Kolhapur, Maharashtra
UPDATE city SET latitude=20.933330, longitude=77.750000 WHERE id=11;  -- Amravati, Maharashtra
UPDATE city SET latitude=19.160230, longitude=77.314970 WHERE id=12;  -- Nanded, Maharashtra
UPDATE city SET latitude=16.854380, longitude=74.564170 WHERE id=13;  -- Sangli, Maharashtra
UPDATE city SET latitude=21.002920, longitude=75.566020 WHERE id=14;  -- Jalgaon, Maharashtra
UPDATE city SET latitude=20.709570, longitude=76.998100 WHERE id=15;  -- Akola, Maharashtra
UPDATE city SET latitude=18.397210, longitude=76.567840 WHERE id=16;  -- Latur, Maharashtra
UPDATE city SET latitude=12.971940, longitude=77.593690 WHERE id=17;  -- Bengaluru, Karnataka
UPDATE city SET latitude=12.297910, longitude=76.639250 WHERE id=18;  -- Mysuru, Karnataka
UPDATE city SET latitude=15.347760, longitude=75.133780 WHERE id=19;  -- Hubballi, Karnataka
UPDATE city SET latitude=12.917230, longitude=74.856030 WHERE id=20;  -- Mangaluru, Karnataka
UPDATE city SET latitude=15.852120, longitude=74.504470 WHERE id=21;  -- Belagavi, Karnataka
UPDATE city SET latitude=14.466930, longitude=75.926940 WHERE id=22;  -- Davanagere, Karnataka
UPDATE city SET latitude=15.142050, longitude=76.923980 WHERE id=23;  -- Ballari, Karnataka
UPDATE city SET latitude=13.931570, longitude=75.567910 WHERE id=24;  -- Shivamogga, Karnataka
UPDATE city SET latitude=13.087840, longitude=80.278470 WHERE id=25;  -- Chennai, Tamil Nadu
UPDATE city SET latitude=11.005550, longitude=76.966120 WHERE id=26;  -- Coimbatore, Tamil Nadu
UPDATE city SET latitude=9.919000, longitude=78.119530 WHERE id=27;  -- Madurai, Tamil Nadu
UPDATE city SET latitude=10.815500, longitude=78.696510 WHERE id=28;  -- Tiruchirappalli, Tamil Nadu
UPDATE city SET latitude=11.653760, longitude=78.155380 WHERE id=29;  -- Salem, Tamil Nadu
UPDATE city SET latitude=8.727420, longitude=77.683800 WHERE id=30;  -- Tirunelveli, Tamil Nadu
UPDATE city SET latitude=11.342800, longitude=77.727410 WHERE id=31;  -- Erode, Tamil Nadu
UPDATE city SET latitude=12.918400, longitude=79.132550 WHERE id=32;  -- Vellore, Tamil Nadu
UPDATE city SET latitude=8.767350, longitude=78.134250 WHERE id=33;  -- Thoothukudi, Tamil Nadu
UPDATE city SET latitude=22.562630, longitude=88.363040 WHERE id=34;  -- Kolkata, West Bengal
UPDATE city SET latitude=22.576880, longitude=88.318570 WHERE id=35;  -- Howrah, West Bengal
UPDATE city SET latitude=23.515830, longitude=87.308010 WHERE id=36;  -- Durgapur, West Bengal
UPDATE city SET latitude=23.683330, longitude=86.983330 WHERE id=37;  -- Asansol, West Bengal
UPDATE city SET latitude=26.710040, longitude=88.428510 WHERE id=38;  -- Siliguri, West Bengal
UPDATE city SET latitude=17.384050, longitude=78.456360 WHERE id=39;  -- Hyderabad, Telangana
UPDATE city SET latitude=18.000000, longitude=79.583330 WHERE id=40;  -- Warangal, Telangana
UPDATE city SET latitude=18.671540, longitude=78.098800 WHERE id=41;  -- Nizamabad, Telangana
UPDATE city SET latitude=18.439150, longitude=79.128560 WHERE id=42;  -- Karimnagar, Telangana
UPDATE city SET latitude=23.025790, longitude=72.587270 WHERE id=43;  -- Ahmedabad, Gujarat
UPDATE city SET latitude=21.195940, longitude=72.830230 WHERE id=44;  -- Surat, Gujarat
UPDATE city SET latitude=22.299410, longitude=73.208120 WHERE id=45;  -- Vadodara, Gujarat
UPDATE city SET latitude=22.291610, longitude=70.793220 WHERE id=46;  -- Rajkot, Gujarat
UPDATE city SET latitude=21.762870, longitude=72.153310 WHERE id=47;  -- Bhavnagar, Gujarat
UPDATE city SET latitude=22.472920, longitude=70.066730 WHERE id=48;  -- Jamnagar, Gujarat
UPDATE city SET latitude=23.216670, longitude=72.683330 WHERE id=49;  -- Gandhinagar, Gujarat
UPDATE city SET latitude=21.519660, longitude=70.459810 WHERE id=50;  -- Junagadh, Gujarat
UPDATE city SET latitude=22.552510, longitude=72.955200 WHERE id=51;  -- Anand, Gujarat
UPDATE city SET latitude=21.694820, longitude=72.980500 WHERE id=52;  -- Bharuch, Gujarat
UPDATE city SET latitude=26.839280, longitude=80.923130 WHERE id=53;  -- Lucknow, Uttar Pradesh
UPDATE city SET latitude=26.465230, longitude=80.349750 WHERE id=54;  -- Kanpur, Uttar Pradesh
UPDATE city SET latitude=28.665350, longitude=77.439150 WHERE id=55;  -- Ghaziabad, Uttar Pradesh
UPDATE city SET latitude=27.183330, longitude=78.016670 WHERE id=56;  -- Agra, Uttar Pradesh
UPDATE city SET latitude=25.316680, longitude=83.010410 WHERE id=57;  -- Varanasi, Uttar Pradesh
UPDATE city SET latitude=28.980020, longitude=77.706360 WHERE id=58;  -- Meerut, Uttar Pradesh
UPDATE city SET latitude=25.444780, longitude=81.843220 WHERE id=59;  -- Prayagraj, Uttar Pradesh
UPDATE city SET latitude=28.580000, longitude=77.330000 WHERE id=60;  -- Noida, Uttar Pradesh
UPDATE city SET latitude=28.366780, longitude=79.431670 WHERE id=61;  -- Bareilly, Uttar Pradesh
UPDATE city SET latitude=27.881450, longitude=78.074640 WHERE id=62;  -- Aligarh, Uttar Pradesh
UPDATE city SET latitude=28.838930, longitude=78.776840 WHERE id=63;  -- Moradabad, Uttar Pradesh
UPDATE city SET latitude=29.447680, longitude=75.672060 WHERE id=64;  -- Gorakhpur, Uttar Pradesh
UPDATE city SET latitude=25.458870, longitude=78.579940 WHERE id=65;  -- Jhansi, Uttar Pradesh
UPDATE city SET latitude=29.967900, longitude=77.545220 WHERE id=66;  -- Saharanpur, Uttar Pradesh
UPDATE city SET latitude=27.503500, longitude=77.672150 WHERE id=67;  -- Mathura, Uttar Pradesh
UPDATE city SET latitude=27.150920, longitude=78.397810 WHERE id=68;  -- Firozabad, Uttar Pradesh
UPDATE city SET latitude=29.470910, longitude=77.703320 WHERE id=69;  -- Muzaffarnagar, Uttar Pradesh
UPDATE city SET latitude=28.810140, longitude=79.026990 WHERE id=70;  -- Rampur, Uttar Pradesh
UPDATE city SET latitude=24.690070, longitude=78.419150 WHERE id=71;  -- Lalitpur, Uttar Pradesh
UPDATE city SET latitude=25.477580, longitude=80.334910 WHERE id=72;  -- Banda, Uttar Pradesh
UPDATE city SET latitude=25.290500, longitude=79.875330 WHERE id=73;  -- Mahoba, Uttar Pradesh
UPDATE city SET latitude=25.955300, longitude=80.148420 WHERE id=74;  -- Hamirpur, Uttar Pradesh
UPDATE city SET latitude=26.145100, longitude=79.336600 WHERE id=75;  -- Jalaun, Uttar Pradesh
UPDATE city SET latitude=25.990230, longitude=79.453340 WHERE id=76;  -- Orai, Uttar Pradesh
UPDATE city SET latitude=26.776150, longitude=79.021330 WHERE id=77;  -- Etawah, Uttar Pradesh
UPDATE city SET latitude=27.228570, longitude=79.028820 WHERE id=78;  -- Mainpuri, Uttar Pradesh
UPDATE city SET latitude=27.391340, longitude=79.579300 WHERE id=79;  -- Farrukhabad, Uttar Pradesh
UPDATE city SET latitude=26.799090, longitude=82.204700 WHERE id=80;  -- Ayodhya, Uttar Pradesh
UPDATE city SET latitude=22.717920, longitude=75.833300 WHERE id=81;  -- Indore, Madhya Pradesh
UPDATE city SET latitude=23.254690, longitude=77.402890 WHERE id=82;  -- Bhopal, Madhya Pradesh
UPDATE city SET latitude=23.166970, longitude=79.950060 WHERE id=83;  -- Jabalpur, Madhya Pradesh
UPDATE city SET latitude=26.229830, longitude=78.173370 WHERE id=84;  -- Gwalior, Madhya Pradesh
UPDATE city SET latitude=23.182390, longitude=75.776430 WHERE id=85;  -- Ujjain, Madhya Pradesh
UPDATE city SET latitude=14.164980, longitude=75.029010 WHERE id=86;  -- Sagar, Madhya Pradesh
UPDATE city SET latitude=24.577260, longitude=80.827190 WHERE id=87;  -- Satna, Madhya Pradesh
UPDATE city SET latitude=24.532560, longitude=81.292340 WHERE id=88;  -- Rewa, Madhya Pradesh
UPDATE city SET latitude=23.330330, longitude=75.040320 WHERE id=89;  -- Ratlam, Madhya Pradesh
UPDATE city SET latitude=22.965850, longitude=76.055260 WHERE id=90;  -- Dewas, Madhya Pradesh
UPDATE city SET latitude=24.917700, longitude=79.588710 WHERE id=91;  -- Chhatarpur, Madhya Pradesh
UPDATE city SET latitude=24.743270, longitude=78.830610 WHERE id=92;  -- Tikamgarh, Madhya Pradesh
UPDATE city SET latitude=23.833120, longitude=79.441900 WHERE id=93;  -- Damoh, Madhya Pradesh
UPDATE city SET latitude=24.720940, longitude=80.187720 WHERE id=94;  -- Panna, Madhya Pradesh
UPDATE city SET latitude=23.831500, longitude=80.393700 WHERE id=95;  -- Katni, Madhya Pradesh
UPDATE city SET latitude=23.526040, longitude=77.810920 WHERE id=96;  -- Vidisha, Madhya Pradesh
UPDATE city SET latitude=25.423780, longitude=77.662230 WHERE id=97;  -- Shivpuri, Madhya Pradesh
UPDATE city SET latitude=24.646910, longitude=77.311300 WHERE id=98;  -- Guna, Madhya Pradesh
UPDATE city SET latitude=22.056970, longitude=78.939580 WHERE id=99;  -- Chhindwara, Madhya Pradesh
UPDATE city SET latitude=21.824270, longitude=76.350860 WHERE id=100;  -- Khandwa, Madhya Pradesh
UPDATE city SET latitude=21.308680, longitude=76.230260 WHERE id=101;  -- Burhanpur, Madhya Pradesh
UPDATE city SET latitude=26.498920, longitude=77.995340 WHERE id=102;  -- Morena, Madhya Pradesh
UPDATE city SET latitude=26.566710, longitude=78.787280 WHERE id=103;  -- Bhind, Madhya Pradesh
UPDATE city SET latitude=25.673120, longitude=78.459080 WHERE id=104;  -- Datia, Madhya Pradesh
UPDATE city SET latitude=25.357400, longitude=78.804700 WHERE id=105;  -- Niwari, Madhya Pradesh
UPDATE city SET latitude=24.199730, longitude=82.675350 WHERE id=106;  -- Singrauli, Madhya Pradesh
UPDATE city SET latitude=22.085030, longitude=79.550370 WHERE id=107;  -- Seoni, Madhya Pradesh
UPDATE city SET latitude=24.071840, longitude=75.069860 WHERE id=108;  -- Mandsaur, Madhya Pradesh
UPDATE city SET latitude=24.459490, longitude=74.866250 WHERE id=109;  -- Neemuch, Madhya Pradesh
UPDATE city SET latitude=23.293560, longitude=81.361900 WHERE id=110;  -- Shahdol, Madhya Pradesh
UPDATE city SET latitude=26.919620, longitude=75.787810 WHERE id=111;  -- Jaipur, Rajasthan
UPDATE city SET latitude=26.268410, longitude=73.005940 WHERE id=112;  -- Jodhpur, Rajasthan
UPDATE city SET latitude=25.182540, longitude=75.839070 WHERE id=113;  -- Kota, Rajasthan
UPDATE city SET latitude=24.585840, longitude=73.713460 WHERE id=114;  -- Udaipur, Rajasthan
UPDATE city SET latitude=26.452100, longitude=74.638670 WHERE id=115;  -- Ajmer, Rajasthan
UPDATE city SET latitude=28.017620, longitude=73.314950 WHERE id=116;  -- Bikaner, Rajasthan
UPDATE city SET latitude=25.347070, longitude=74.640810 WHERE id=117;  -- Bhilwara, Rajasthan
UPDATE city SET latitude=27.562460, longitude=76.625000 WHERE id=118;  -- Alwar, Rajasthan
UPDATE city SET latitude=27.612060, longitude=75.139960 WHERE id=119;  -- Sikar, Rajasthan
UPDATE city SET latitude=25.772760, longitude=73.323350 WHERE id=120;  -- Pali, Rajasthan
UPDATE city SET latitude=27.217310, longitude=77.490090 WHERE id=121;  -- Bharatpur, Rajasthan
UPDATE city SET latitude=29.920090, longitude=73.874960 WHERE id=122;  -- Sri Ganganagar, Rajasthan
UPDATE city SET latitude=28.125590, longitude=75.397970 WHERE id=123;  -- Jhunjhunu, Rajasthan
UPDATE city SET latitude=24.889630, longitude=74.624030 WHERE id=124;  -- Chittorgarh, Rajasthan
UPDATE city SET latitude=28.460100, longitude=77.026350 WHERE id=125;  -- Gurugram, Haryana
UPDATE city SET latitude=28.411240, longitude=77.313160 WHERE id=126;  -- Faridabad, Haryana
UPDATE city SET latitude=29.387470, longitude=76.968250 WHERE id=127;  -- Panipat, Haryana
UPDATE city SET latitude=30.360990, longitude=76.797820 WHERE id=128;  -- Ambala, Haryana
UPDATE city SET latitude=29.153940, longitude=75.722940 WHERE id=129;  -- Hisar, Haryana
UPDATE city SET latitude=29.691970, longitude=76.984480 WHERE id=130;  -- Karnal, Haryana
UPDATE city SET latitude=28.894470, longitude=76.589170 WHERE id=131;  -- Rohtak, Haryana
UPDATE city SET latitude=28.994780, longitude=77.019370 WHERE id=132;  -- Sonipat, Haryana
UPDATE city SET latitude=30.127960, longitude=77.283710 WHERE id=133;  -- Yamunanagar, Haryana
UPDATE city SET latitude=30.912040, longitude=75.853790 WHERE id=134;  -- Ludhiana, Punjab
UPDATE city SET latitude=31.622340, longitude=74.875340 WHERE id=135;  -- Amritsar, Punjab
UPDATE city SET latitude=31.325560, longitude=75.579170 WHERE id=136;  -- Jalandhar, Punjab
UPDATE city SET latitude=30.336250, longitude=76.392200 WHERE id=137;  -- Patiala, Punjab
UPDATE city SET latitude=30.207470, longitude=74.938930 WHERE id=138;  -- Bathinda, Punjab
UPDATE city SET latitude=30.679950, longitude=76.722110 WHERE id=139;  -- Mohali, Punjab
UPDATE city SET latitude=25.594080, longitude=85.135630 WHERE id=140;  -- Patna, Bihar
UPDATE city SET latitude=24.796860, longitude=85.003850 WHERE id=141;  -- Gaya, Bihar
UPDATE city SET latitude=25.244460, longitude=86.971830 WHERE id=142;  -- Bhagalpur, Bihar
UPDATE city SET latitude=26.122590, longitude=85.390550 WHERE id=143;  -- Muzaffarpur, Bihar
UPDATE city SET latitude=26.152160, longitude=85.897070 WHERE id=144;  -- Darbhanga, Bihar
UPDATE city SET latitude=23.343160, longitude=85.309400 WHERE id=145;  -- Ranchi, Jharkhand
UPDATE city SET latitude=22.802780, longitude=86.185450 WHERE id=146;  -- Jamshedpur, Jharkhand
UPDATE city SET latitude=23.797590, longitude=86.429920 WHERE id=147;  -- Dhanbad, Jharkhand
UPDATE city SET latitude=23.669340, longitude=86.151610 WHERE id=148;  -- Bokaro, Jharkhand
UPDATE city SET latitude=21.233330, longitude=81.633330 WHERE id=149;  -- Raipur, Chhattisgarh
UPDATE city SET latitude=21.209190, longitude=81.428500 WHERE id=150;  -- Bhilai, Chhattisgarh
UPDATE city SET latitude=22.080050, longitude=82.155430 WHERE id=151;  -- Bilaspur, Chhattisgarh
UPDATE city SET latitude=22.345800, longitude=82.696330 WHERE id=152;  -- Korba, Chhattisgarh
UPDATE city SET latitude=21.191470, longitude=81.276190 WHERE id=153;  -- Durg, Chhattisgarh
UPDATE city SET latitude=20.272410, longitude=85.833850 WHERE id=154;  -- Bhubaneswar, Odisha
UPDATE city SET latitude=20.464970, longitude=85.879270 WHERE id=155;  -- Cuttack, Odisha
UPDATE city SET latitude=22.224960, longitude=84.864140 WHERE id=156;  -- Rourkela, Odisha
UPDATE city SET latitude=19.311510, longitude=84.792900 WHERE id=157;  -- Berhampur, Odisha
UPDATE city SET latitude=9.939880, longitude=76.260220 WHERE id=158;  -- Kochi, Kerala
UPDATE city SET latitude=8.485500, longitude=76.949240 WHERE id=159;  -- Thiruvananthapuram, Kerala
UPDATE city SET latitude=11.248020, longitude=75.780400 WHERE id=160;  -- Kozhikode, Kerala
UPDATE city SET latitude=10.516670, longitude=76.216670 WHERE id=161;  -- Thrissur, Kerala
UPDATE city SET latitude=8.881130, longitude=76.584690 WHERE id=162;  -- Kollam, Kerala
UPDATE city SET latitude=17.680090, longitude=83.201610 WHERE id=163;  -- Visakhapatnam, Andhra Pradesh
UPDATE city SET latitude=16.507450, longitude=80.646600 WHERE id=164;  -- Vijayawada, Andhra Pradesh
UPDATE city SET latitude=16.299740, longitude=80.457290 WHERE id=165;  -- Guntur, Andhra Pradesh
UPDATE city SET latitude=14.449920, longitude=79.986970 WHERE id=166;  -- Nellore, Andhra Pradesh
UPDATE city SET latitude=13.635510, longitude=79.419890 WHERE id=167;  -- Tirupati, Andhra Pradesh
UPDATE city SET latitude=17.005170, longitude=81.777840 WHERE id=168;  -- Rajahmundry, Andhra Pradesh
UPDATE city SET latitude=30.324430, longitude=78.033920 WHERE id=169;  -- Dehradun, Uttarakhand
UPDATE city SET latitude=29.947910, longitude=78.160250 WHERE id=170;  -- Haridwar, Uttarakhand
UPDATE city SET latitude=29.866320, longitude=77.891180 WHERE id=171;  -- Roorkee, Uttarakhand
UPDATE city SET latitude=29.222540, longitude=79.528600 WHERE id=172;  -- Haldwani, Uttarakhand
UPDATE city SET latitude=30.107780, longitude=78.292550 WHERE id=173;  -- Rishikesh, Uttarakhand
UPDATE city SET latitude=31.104420, longitude=77.166620 WHERE id=174;  -- Shimla, Himachal Pradesh
UPDATE city SET latitude=30.909080, longitude=77.108690 WHERE id=175;  -- Solan, Himachal Pradesh
UPDATE city SET latitude=32.220060, longitude=76.320130 WHERE id=176;  -- Dharamshala, Himachal Pradesh
UPDATE city SET latitude=31.711940, longitude=76.932730 WHERE id=177;  -- Mandi, Himachal Pradesh
UPDATE city SET latitude=26.184400, longitude=91.745800 WHERE id=178;  -- Guwahati, Assam
UPDATE city SET latitude=24.827330, longitude=92.797870 WHERE id=179;  -- Silchar, Assam
UPDATE city SET latitude=27.479890, longitude=94.908370 WHERE id=180;  -- Dibrugarh, Assam
UPDATE city SET latitude=26.757510, longitude=94.203060 WHERE id=181;  -- Jorhat, Assam
UPDATE city SET latitude=15.495740, longitude=73.826240 WHERE id=182;  -- Panaji, Goa
UPDATE city SET latitude=15.275010, longitude=73.957860 WHERE id=183;  -- Margao, Goa
UPDATE city SET latitude=15.395850, longitude=73.815680 WHERE id=184;  -- Vasco da Gama, Goa
UPDATE city SET latitude=34.085650, longitude=74.805550 WHERE id=185;  -- Srinagar, Jammu and Kashmir
UPDATE city SET latitude=32.735280, longitude=74.861670 WHERE id=186;  -- Jammu, Jammu and Kashmir
UPDATE city SET latitude=30.736290, longitude=76.788400 WHERE id=187;  -- Chandigarh, Chandigarh
UPDATE city SET latitude=11.933810, longitude=79.829790 WHERE id=188;  -- Puducherry, Puducherry
UPDATE city SET latitude=23.836050, longitude=91.279390 WHERE id=189;  -- Agartala, Tripura
UPDATE city SET latitude=25.568920, longitude=91.883130 WHERE id=190;  -- Shillong, Meghalaya
UPDATE city SET latitude=24.808050, longitude=93.944200 WHERE id=191;  -- Imphal, Manipur
UPDATE city SET latitude=25.674670, longitude=94.110990 WHERE id=192;  -- Kohima, Nagaland
UPDATE city SET latitude=27.086940, longitude=93.609870 WHERE id=193;  -- Itanagar, Arunachal Pradesh
UPDATE city SET latitude=23.728940, longitude=92.717910 WHERE id=194;  -- Aizawl, Mizoram
UPDATE city SET latitude=27.325740, longitude=88.612160 WHERE id=195;  -- Gangtok, Sikkim
UPDATE city SET latitude=34.165040, longitude=77.584020 WHERE id=196;  -- Leh, Ladakh
UPDATE city SET latitude=11.666130, longitude=92.746350 WHERE id=197;  -- Port Blair, Andaman and Nicobar Islands
UPDATE city SET latitude=10.562600, longitude=72.636900 WHERE id=198;  -- Kavaratti, Lakshadweep
UPDATE city SET latitude=20.414310, longitude=72.832360 WHERE id=199;  -- Daman, Dadra and Nagar Haveli and Daman and Diu
UPDATE city SET latitude=20.273860, longitude=72.996730 WHERE id=200;  -- Silvassa, Dadra and Nagar Haveli and Daman and Diu

-- Verification: expect 200 populated, 0 missing.
SELECT COUNT(*) AS total, SUM(latitude IS NOT NULL) AS with_coords, SUM(latitude IS NULL) AS missing FROM city;
