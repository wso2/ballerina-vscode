public type Purchase record {|
    readonly int purchaseId;
    string customerName;
    int quantity;
    decimal totalPrice;
    int albumId;
|};

public type PurchaseOptionalized record {|
    int purchaseId?;
    string customerName?;
    int quantity?;
    decimal totalPrice?;
    int albumId?;
|};

public type PurchaseWithRelations record {|
    *PurchaseOptionalized;
    AlbumOptionalized album?;
|};

public type PurchaseTargetType typedesc<PurchaseWithRelations>;

public type AlbumRating record {|
    readonly string customerName;
    int? rating;
    string? review;
    int albumId;
|};

public type AlbumRatingOptionalized record {|
    string customerName?;
    int? rating?;
    string? review?;
    int albumId?;
|};

public type AlbumRatingWithRelations record {|
    *AlbumRatingOptionalized;
    AlbumOptionalized album?;
|};

public type AlbumRatingTargetType typedesc<AlbumRatingWithRelations>;

public type Album record {|
    readonly int albumId;
    string title;
    string artist;
    decimal price;
    int stock;
|};

public type AlbumOptionalized record {|
    int albumId?;
    string title?;
    string artist?;
    decimal price?;
    int stock?;
|};

public type AlbumWithRelations record {|
    *AlbumOptionalized;
    AlbumRatingOptionalized[] albumratings?;
    PurchaseOptionalized[] purchases?;
|};

public type AlbumTargetType typedesc<AlbumWithRelations>;
