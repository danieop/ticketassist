	Create database SellCard
GO
USE SellCard
GO
CREATE TABLE [dbo].[User](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[username] [nvarchar](30) NULL,
	[password] [nvarchar] (max) NULL,
	[email] [nvarchar] (max) NULL,
	[phoneNumber] [nvarchar] (30) NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
	[role] [nvarchar](30)NULL,
) 

CREATE TABLE [dbo].[UserWallet](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL UNIQUE references [User](ID),
	[amount] [float] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[TransactionHistory](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserWalletID] [int] NOT NULL references [UserWallet](ID),
	[amount] [float] NULL,
	[method] [nvarchar](30) NULL,
	[processStatus] [bit] NULL,
	[successStatus] [bit] NULL,
	[createdAt] [date] NOT NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)


CREATE TABLE [dbo].[ProviderDetail](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[providerName] [nvarchar](30) NULL,
	[image][nvarchar](max) NULL,
	[category][nvarchar](30) NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)
CREATE TABLE [dbo].[CardDetail](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[ProviderID] [int] NOT NULL references [ProviderDetail](ID),
	[price] [float] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
	[quantity] [int] NULL,
)

CREATE TABLE [dbo].[CardDiscount](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[CardDetailID] [int] NOT NULL references [CardDetail](ID),
	[percent] [float] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[expiredAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[Card](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[CardDetailID] [int] NOT NULL references [CardDetail](ID),
	[seriNumber] [int] NULL,
	[pinNumber] [int] NULL,
	[OrderItemID] [int] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isBought] [bit] NULL,
	[boughtBy] [int] NULL,
	[boughtAt] [date] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
) 

CREATE TABLE [dbo].[CartItem](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL references [User](ID),
	[CardDetailID] [int] NOT NULL references [CardDetail](ID),
	[quantity] [int] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[PaymentDetail](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL references [User](ID),
	[amount] [float] NULL,
	[status] [nvarchar] (max) NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[Order](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL references [User](ID),
	[PaymentID] [int] NOT NULL UNIQUE references [PaymentDetail](ID),
	[total] [float] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[OrderItem](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[OrderID] [int] NOT NULL references [Order](ID),
	[CardDetailID] [int] NOT NULL references [CardDetail](ID),
	[quantity] [int] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)

CREATE TABLE [dbo].[PurchaseHistory](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL references [User](ID),
	[OrderID] [int] NOT NULL references [Order](ID),
	[providerName] [nvarchar](30) NULL,
	[image][nvarchar](max) NULL,
	[price] [float] NULL,
	[quantity] [int] NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)


CREATE TABLE [dbo].[Role](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[name] [nvarchar](30) NULL,
	[description] [nvarchar](max) NULL,
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)
CREATE TABLE [dbo].[UserRole](
	[ID] [int] IDENTITY(1,1) NOT NULL primary key,
	[UserID] [int] NOT NULL references [User](ID),
	[RoleID] [int] NOT NULL references [Role](ID),
	[createdAt] [date] NOT NULL,
	[updatedAt] [date] NULL,
	[createdBy] [int] NULL,
	[isDeleted] [bit] NULL,
	[deletedBy] [int] NULL,
	[deletedAt] [date] NULL,
)
DROP TABLE [dbo].[Role]
DROP TABLE [dbo].[UserRole]
INSERT INTO [dbo].[CardDetail] (provider,category,createdAt) values ('Viettel','phonecard',getdate())
INSERT INTO [dbo].[CardDetail] (provider,createdAt) values ('Vinaphone',getdate())
INSERT INTO [dbo].[PriceDetail] (PhoneCardID,createdAt,price,discountPercent) values (1,getdate(),'10000',2)
INSERT INTO [dbo].[PriceDetail] (PhoneCardID,createdAt,price,discountPercent) values (2,getdate(),'20000',1)
SELECT COUNT(*) FROM ProviderDetail

DECLARE @OrderID INT
DECLARE @CardDetailID INT
DECLARE @quantity INT
DECLARE @createdAt DATE
DECLARE @updatedAt DATE
DECLARE @createdBy INT
DECLARE @isDeleted BIT
DECLARE @deletedBy INT
DECLARE @deletedAt DATE

DECLARE @UserID INT
DECLARE @providerName NVARCHAR(30)
DECLARE @image NVARCHAR(MAX)
DECLARE @price FLOAT

DECLARE OrderItemCursor CURSOR FOR
SELECT OrderID, CardDetailID, quantity, createdAt, updatedAt, createdBy, isDeleted, deletedBy, deletedAt
FROM OrderItem

OPEN OrderItemCursor
FETCH NEXT FROM OrderItemCursor INTO @OrderID, @CardDetailID, @quantity, @createdAt, @updatedAt, @createdBy, @isDeleted, @deletedBy, @deletedAt

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Get additional details from related tables
    SELECT @UserID = o.UserID
    FROM [Order] o
    WHERE o.ID = @OrderID

    SELECT @providerName = pd.providerName, @image = pd.image, @price = cd.price
    FROM CardDetail cd
    INNER JOIN ProviderDetail pd ON cd.ProviderID = pd.ID
    WHERE cd.ID = @CardDetailID

    -- Insert into PurchaseHistory
    INSERT INTO PurchaseHistory (UserID, OrderID, providerName, image, price, quantity, createdAt, updatedAt, createdBy, isDeleted, deletedBy, deletedAt)
    VALUES (@UserID, @OrderID, @providerName, @image, @price, @quantity, @createdAt, @updatedAt, @createdBy, @isDeleted, @deletedBy, @deletedAt)

    FETCH NEXT FROM OrderItemCursor INTO @OrderID, @CardDetailID, @quantity, @createdAt, @updatedAt, @createdBy, @isDeleted, @deletedBy, @deletedAt
END

CLOSE OrderItemCursor
DEALLOCATE OrderItemCursor

CREATE TRIGGER trg_InsertPurchaseHistory
ON OrderItem
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PurchaseHistory (UserID, OrderID, providerName, image, price, quantity, createdAt, updatedAt, createdBy, isDeleted, deletedBy, deletedAt)
    SELECT 
        o.UserID, 
        i.OrderID, 
        pd.providerName, 
        pd.image, 
        cd.price, 
        i.quantity, 
        i.createdAt, 
        i.updatedAt, 
        i.createdBy, 
        i.isDeleted, 
        i.deletedBy, 
        i.deletedAt
    FROM 
        inserted i
    INNER JOIN 
        [Order] o ON i.OrderID = o.ID
    INNER JOIN 
        CardDetail cd ON i.CardDetailID = cd.ID
    INNER JOIN 
        ProviderDetail pd ON cd.ProviderID = pd.ID;
END;
SELECT
    [so].[name] AS [trigger_name],
    USER_NAME([so].[uid]) AS [trigger_owner],
    USER_NAME([so2].[uid]) AS [table_schema],
    OBJECT_NAME([so].[parent_obj]) AS [table_name],
    OBJECTPROPERTY( [so].[id], 'ExecIsUpdateTrigger') AS [isupdate],
    OBJECTPROPERTY( [so].[id], 'ExecIsDeleteTrigger') AS [isdelete],
    OBJECTPROPERTY( [so].[id], 'ExecIsInsertTrigger') AS [isinsert],
    OBJECTPROPERTY( [so].[id], 'ExecIsAfterTrigger') AS [isafter],
    OBJECTPROPERTY( [so].[id], 'ExecIsInsteadOfTrigger') AS [isinsteadof],
    OBJECTPROPERTY([so].[id], 'ExecIsTriggerDisabled') AS [disabled] 
FROM sysobjects AS [so]
INNER JOIN sysobjects AS so2 ON so.parent_obj = so2.Id
WHERE [so].[type] = 'TR'