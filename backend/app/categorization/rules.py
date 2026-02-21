"""
Rule-based transaction categorizer.
Each rule is (category_name, [keywords...]). Keywords are matched
case-insensitively as substrings of the transaction description.
The first matching rule wins.
"""

_RULES: list[tuple[str, list[str]]] = [
    ("Food & Dining", [
        "UBER EATS", "UBEREATS", "DOORDASH", "SKIP THE DISHES", "SKIP",
        "MCDONALDS", "TIM HORTONS", "STARBUCKS", "SUBWAY", "PIZZA HUT",
        "DOMINOS", "BURGER KING", "WENDYS", "A&W", "CHIPOTLE",
        "PANERA", "KFC", "HARVEYS", "MARY BROWNS", "FIVE GUYS",
        "SWISS CHALET", "EAST SIDE MARIOS", "BOSTON PIZZA",
    ]),
    ("Groceries", [
        "WALMART", "LOBLAWS", "METRO", "SOBEYS", "NO FRILLS",
        "FOOD BASICS", "FRESHCO", "WHOLE FOODS", "COSTCO", "VALUMART",
        "ZEHRS", "REAL CANADIAN SUPERSTORE", "SUPERSTORE", "INDEPENDENT",
        "FARM BOY", "T&T", "LONGOS", "NATIONS FRESH",
    ]),
    ("Subscriptions", [
        "NETFLIX", "SPOTIFY", "DISNEY PLUS", "DISNEY+", "APPLE.COM/BILL",
        "AMAZON PRIME", "YOUTUBE PREMIUM", "HBO", "PARAMOUNT", "CRAVE",
        "MICROSOFT 365", "ADOBE", "DUOLINGO", "DROPBOX", "NOTION",
        "GITHUB", "CHATGPT", "OPENAI", "TWITCH",
    ]),
    ("Transportation", [
        "UBER", "LYFT", "PRESTO", "GO TRANSIT", "VIA RAIL",
        "IMPARK", "GREEN P", "PARKWHIZ", "UHAUL", "ENTERPRISE RENT",
        "BUDGET RENT", "CAR2GO", "ZIPCAR", "VIA BUS",
        "GREYHOUND", "MEGABUS", "TORONTO TRANSIT", "TTC",
    ]),
    ("Shopping", [
        "AMAZON", "EBAY", "SHEIN", "H&M", "ZARA",
        "ARITZIA", "INDIGO", "BEST BUY", "NIKE", "SPORT CHEK",
        "THE BAY", "WINNERS", "MARSHALLS", "OLD NAVY", "GAP",
        "IKEA", "HOME DEPOT", "CANADIAN TIRE", "WAYFAIR",
    ]),
    ("Health & Fitness", [
        "GOODLIFE", "PLANET FITNESS", "ANYTIME FITNESS", "SHOPPERS DRUG",
        "REXALL", "LONDON DRUGS", "SDM", "SEPHORA",
        "MASSAGE", "PHYSIOTHERAPY", "DENTAL", "OPTOMETRY",
        "MEDICAL", "PHARMACY", "CLINIQUE", "GNC",
    ]),
    ("Utilities & Bills", [
        "HYDRO", "BELL CANADA", "ROGERS", "TELUS", "FIDO",
        "VIRGIN MOBILE", "PUBLIC MOBILE", "ENBRIDGE", "UNION GAS",
        "COGECO", "SHAW", "EASTLINK", "FREEDOM MOBILE",
        "TORONTO WATER", "INSURANCE", "WAWANESA", "INTACT",
    ]),
    ("Entertainment", [
        "CINEPLEX", "AMC THEATRE", "TICKETMASTER", "EVENTBRITE",
        "STEAM", "PLAYSTATION", "XBOX", "NINTENDO", "EPIC GAMES",
        "APPLE ARCADE", "GOOGLE PLAY", "HUMBLE BUNDLE",
        "BANDCAMP", "ITUNES", "AUDIBLE",
    ]),
    ("Travel", [
        "AIRBNB", "BOOKING.COM", "EXPEDIA", "AIR CANADA", "WESTJET",
        "PORTER AIRLINES", "HOTELS.COM", "MARRIOTT", "HILTON",
        "DELTA", "UNITED AIRLINES", "KAYAK", "TRIVAGO",
        "VRBO", "HERTZ",
    ]),
    ("Banking & Fees", [
        "SERVICE FEE", "MONTHLY FEE", "NSF FEE", "OVERDRAFT",
        "INTERAC E-TRANSFER", "WIRE TRANSFER", "FOREIGN EXCHANGE",
        "ATM FEE", "ANNUAL FEE", "INTEREST CHARGE",
        "LOAN PAYMENT", "MORTGAGE", "LINE OF CREDIT",
    ]),
]


def categorize_transaction(description: str) -> tuple[str, float]:
    """
    Match description against keyword rules.

    Returns:
        (category, confidence) where confidence is 1.0 on a match
        and 0.0 when no rule matches (category = "Uncategorized").
    """
    upper = description.upper()
    for category, keywords in _RULES:
        for keyword in keywords:
            if keyword in upper:
                return category, 1.0
    return "Uncategorized", 0.0
