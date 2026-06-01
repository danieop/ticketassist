@startuml
left to right direction

actor "Support / Customer" as Support
actor "Developer / Intern" as Dev
actor "Mentor" as Mentor

rectangle "TicketAssist System" {
  usecase "Submit bug ticket" as UC1
  usecase "Run sequential workflow" as UC2
  usecase "View workflow progress" as UC3
  usecase "View final analysis" as UC4
  usecase "Review AI draft" as UC5
  usecase "Approve result" as UC6
  usecase "Reject result" as UC7
  usecase "Request more information" as UC8
  usecase "View trace / logs" as UC9

  usecase "Analyze ticket" as A1
  usecase "Classify priority" as A2
  usecase "Search related code" as A3
  usecase "Analyze code context" as A4
  usecase "Propose fix direction" as A5
  usecase "Generate mentor draft" as A6
}

Support --> UC1

Dev --> UC1
Dev --> UC2
Dev --> UC3
Dev --> UC4
Dev --> UC9

Mentor --> UC4
Mentor --> UC5
Mentor --> UC6
Mentor --> UC7
Mentor --> UC8
Mentor --> UC9

UC2 --> A1 : <<include>>
UC2 --> A2 : <<include>>
UC2 --> A3 : <<include>>
UC2 --> A4 : <<include>>
UC2 --> A5 : <<include>>
UC2 --> A6 : <<include>>

UC5 --> UC6 : <<extend>>
UC5 --> UC7 : <<extend>>
UC5 --> UC8 : <<extend>>
@enduml