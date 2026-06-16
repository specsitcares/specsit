from django.db import migrations

PINCODE_DATA = [
    ("500043", "Airforce Academy",             "Telangana", "Rangareddi", 5,  True,  100),
    ("500085", "Jntu Kukat pally",             "Telangana", "Hyderabad",  5,  True,  100),
    ("500049", "Miyapur",                      "Telangana", "Rangareddi", 6,  True,  100),
    ("500072", "Kphb Colony",                  "Telangana", "Rangareddi", 6,  True,  100),
    ("500055", "Ida Jeedimetla",               "Telangana", "Rangareddi", 8,  True,  100),
    ("500050", "Chandanagar",                  "Telangana", "Rangareddi", 10, True,  100),
    ("500015", "Aliabad",                      "Telangana", "Hyderabad",  12, True,  100),
    ("500018", "Bharat Nagar colony",          "Telangana", "Hyderabad",  12, True,  100),
    ("500019", "Lingampalli",                  "Telangana", "Rangareddi", 12, True,  100),
    ("500037", "Balanagar Township",           "Telangana", "Rangareddi", 12, True,  100),
    ("500054", "Hmt Township",                 "Telangana", "Rangareddi", 12, True,  100),
    ("500084", "Kondapur",                     "Telangana", "Rangareddi", 12, True,  100),
    ("500038", "Sanjeev Reddy nagar",          "Telangana", "Hyderabad",  14, True,  154),
    ("500032", "Gachibowli",                   "Telangana", "Rangareddi", 15, True,  175),
    ("500042", "Hal",                          "Telangana", "Rangareddi", 15, True,  175),
    ("500081", "Cyberabad",                    "Telangana", "Hyderabad",  15, True,  175),
    ("500011", "Bowenpally",                   "Telangana", "Rangareddi", 16, True,  175),
    ("500033", "Jubilee Hills",                "Telangana", "Hyderabad",  16, True,  175),
    ("500045", "A.Gs. staff quarters",         "Telangana", "Hyderabad",  16, True,  175),
    ("500073", "Srinagar Colony",              "Telangana", "Hyderabad",  16, True,  175),
    ("500016", "Begumpet",                     "Telangana", "Hyderabad",  18, True,  200),
    ("500034", "Banjara Hills",                "Telangana", "Hyderabad",  18, True,  200),
    ("500041", "Raj Bhawan",                   "Telangana", "Hyderabad",  18, True,  200),
    ("500082", "I.M.colony",                   "Telangana", "Hyderabad",  18, True,  200),
    ("500003", "Begumpet Policelines",         "Telangana", "Hyderabad",  20, True,  200),
    ("500004", "A.Gs office",                  "Telangana", "Hyderabad",  20, True,  200),
    ("500008", "Dargah Hussain shahwali",      "Telangana", "Hyderabad",  20, True,  200),
    ("500009", "Manovikasnagar",               "Telangana", "Rangareddi", 20, True,  200),
    ("500010", "Alwal",                        "Telangana", "Rangareddi", 20, True,  200),
    ("500022", "Central Secretariat",          "Telangana", "Hyderabad",  21, True,  250),
    ("500001", "Gandhi Bhawan",                "Telangana", "Hyderabad",  22, True,  250),
    ("500014", "Adraspalli",                   "Telangana", "Rangareddi", 22, False, 250),
    ("500020", "Ashoknagar",                   "Telangana", "Hyderabad",  22, True,  250),
    ("500021", "Eme Records",                  "Telangana", "Rangareddi", 22, True,  250),
    ("500026", "Nehrunagar",                   "Telangana", "Hyderabad",  22, True,  250),
    ("500028", "Dattatreya Colony",            "Telangana", "Hyderabad",  22, True,  250),
    ("500029", "Gagan Mahal",                  "Telangana", "Hyderabad",  22, True,  250),
    ("500031", "Ibrahim Bagh lines",           "Telangana", "Hyderabad",  22, True,  250),
    ("500047", "Anandbagh",                    "Telangana", "Rangareddi", 22, True,  250),
    ("500057", "Vijay Nagar colony",           "Telangana", "Hyderabad",  22, True,  250),
    ("500063", "Lic Division",                 "Telangana", "Hyderabad",  22, None,  250),
    ("500071", "Rail Nilayam",                 "Telangana", "Hyderabad",  22, True,  250),
    ("500080", "Bholakpur",                    "Telangana", "Hyderabad",  22, True,  250),
    ("500006", "Dhoolpet",                     "Telangana", "Hyderabad",  23, True,  250),
    ("500012", "Afzalgunj",                    "Telangana", "Hyderabad",  24, True,  250),
    ("500017", "Lallaguda",                    "Telangana", "Hyderabad",  24, True,  250),
    ("500025", "Himmatnagar",                  "Telangana", "Hyderabad",  24, None,  250),
    ("500027", "Barkatpura",                   "Telangana", "Hyderabad",  24, True,  250),
    ("500044", "Ambernagar",                   "Telangana", "Hyderabad",  24, True,  250),
    ("500056", "Neredmet",                     "Telangana", "Rangareddi", 24, True,  250),
    ("500093", "Vikasnagar",                   "Telangana", "Rangareddi", 24, True,  250),
    ("500094", "Sainikpuri",                   "Telangana", "Rangareddi", 24, True,  250),
    ("500095", "Putlibowli",                   "Telangana", "Hyderabad",  24, True,  250),
    ("500007", "Administrative Buildings",     "Telangana", "Hyderabad",  25, True,  275),
    ("500051", "Hindustan Cables ltd",         "Telangana", "Hyderabad",  25, False, 275),
    ("500061", "Sitaphalmandi",                "Telangana", "Hyderabad",  25, True,  275),
    ("500066", "High Court",                   "Telangana", "Hyderabad",  25, True,  275),
    ("500067", "Kulsumpura",                   "Telangana", "Hyderabad",  25, True,  275),
    ("500075", "Aziz Nagar",                   "Telangana", "Rangareddi", 25, True,  275),
    ("500078", "Nisa Hakimpet",                "Telangana", "Rangareddi", 25, True,  275),
    ("500087", "Allembylines",                 "Telangana", "Rangareddi", 25, True,  275),
    ("501401", "Medchal",                      "Telangana", "Rangareddi", 25, True,  275),
    ("500013", "Amberpet",                     "Telangana", "Hyderabad",  26, True,  300),
    ("500024", "Chanchalguda",                 "Telangana", "Hyderabad",  26, True,  300),
    ("500048", "Attapur",                      "Telangana", "Hyderabad",  26, True,  300),
    ("500002", "Hyderabad Jubilee",            "Telangana", "Hyderabad",  28, True,  300),
    ("500030", "A.G.college",                  "Telangana", "Hyderabad",  28, True,  300),
    ("500036", "Malakpet Colony",              "Telangana", "Hyderabad",  28, True,  300),
    ("500040", "Aphb Colony moulali",          "Telangana", "Hyderabad",  28, True,  300),
    ("500062", "Dr As rao nagar",              "Telangana", "Hyderabad",  28, True,  300),
    ("500064", "Bahadurpura",                  "Telangana", "Hyderabad",  28, True,  300),
    ("500083", "Nagaram",                      "Telangana", "Rangareddi", 28, True,  300),
    ("500023", "Reinbazar",                    "Telangana", "Hyderabad",  29, True,  350),
    ("500065", "Fatehdarwaza",                 "Telangana", "Hyderabad",  29, True,  350),
    ("500052", "Hasannagar",                   "Telangana", "Hyderabad",  30, True,  350),
    ("500059", "Saidabad",                     "Telangana", "Hyderabad",  30, True,  350),
    ("500060", "Dilsukhnagar Colony",          "Telangana", "Hyderabad",  30, True,  350),
    ("500076", "I.E.nacharam",                 "Telangana", "Hyderabad",  30, True,  350),
    ("500102", "Mohannagar",                   "Telangana", "Rangareddi", 30, True,  350),
    ("500035", "Huda Residential complex",     "Telangana", "Hyderabad",  32, True,  350),
    ("500039", "Boduppal",                     "Telangana", "Hyderabad",  32, True,  350),
    ("500053", "Falaknuma",                    "Telangana", "Hyderabad",  32, True,  350),
    ("500068", "Gsi(sr) Bandlaguda",           "Telangana", "Hyderabad",  32, True,  350),
    ("500074", "L B nagar",                    "Telangana", "Hyderabad",  32, True,  350),
    ("500077", "Kattedan Ie",                  "Telangana", "Hyderabad",  32, False, 350),
    ("500070", "Vaidehinagar",                 "Telangana", "Hyderabad",  34, True,  350),
    ("500005", "Balapur",                      "Telangana", "Hyderabad",  35, False, 350),
    ("500079", "Jillellaguda",                 "Telangana", "Hyderabad",  35, True,  350),
    ("501323", "Gaganpahad",                   "Telangana", "Rangareddi", 35, False, 350),
    ("501504", "Amdapur",                      "Telangana", "Rangareddi", 35, False, 350),
    ("500058", "Badangpet",                    "Telangana", "Hyderabad",  38, True,  350),
]


def seed_pincode_rates(apps, schema_editor):
    PincodeDeliveryRate = apps.get_model('sales', 'PincodeDeliveryRate')
    objs = [
        PincodeDeliveryRate(
            pincode=pincode,
            location=location,
            state=state,
            district=district,
            distance_km=distance_km,
            bolt_delivery=bolt_delivery,
            cost=cost,
        )
        for pincode, location, state, district, distance_km, bolt_delivery, cost in PINCODE_DATA
    ]
    PincodeDeliveryRate.objects.bulk_create(objs, ignore_conflicts=True)


def unseed_pincode_rates(apps, schema_editor):
    PincodeDeliveryRate = apps.get_model('sales', 'PincodeDeliveryRate')
    PincodeDeliveryRate.objects.filter(
        pincode__in=[row[0] for row in PINCODE_DATA]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0024_pincodedeliveryrate'),
    ]

    operations = [
        migrations.RunPython(seed_pincode_rates, reverse_code=unseed_pincode_rates),
    ]
