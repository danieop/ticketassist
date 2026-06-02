<!-- Go to https://www.plantuml.com/plantuml/uml then paste all below -->

@startuml
left to right direction
skinparam packageStyle rectangle

actor "Support / Customer" as Support
actor "Developer / Intern" as Dev
actor "Mentor" as Mentor

rectangle "TicketAssist System" {
  package "Ticket Intake" {
    usecase "Submit bug ticket" as UC1
    usecase "Validate ticket input" as UC13
    usecase "Submit missing information" as UC17
  }

  package "Repository Intake" {
    usecase "Connect / upload repository" as UC10
    usecase "Validate repository files" as UC11
    usecase "Index repository for search" as UC12
  }

  package "Workflow Execution" {
    usecase "Run sequential workflow" as UC2
    usecase "Resume workflow" as UC18
    usecase "Handle workflow failure" as UC14
    usecase "Analyze ticket" as A1
    usecase "Classify priority" as A2
    usecase "Search related code" as A3
    usecase "Analyze code context" as A4
    usecase "Propose fix direction" as A5
    usecase "Generate mentor draft" as A6
  }

  package "Monitoring" {
    usecase "Retrieve workflow state" as UC15
    usecase "View workflow progress" as UC3
    usecase "View final analysis" as UC4
    usecase "View trace / logs" as UC9
    usecase "View workflow history" as UC16
  }

  package "Mentor Review" {
    usecase "Review AI draft" as UC5
    usecase "Approve result" as UC6
    usecase "Reject result" as UC7
    usecase "Request more information" as UC8
  }
}

Support --> UC1
Support --> UC17

Dev --> UC1
Dev --> UC2
Dev --> UC3
Dev --> UC4
Dev --> UC9
Dev --> UC10
Dev --> UC16
Dev --> UC17
Dev --> UC18

Mentor --> UC4
Mentor --> UC5
Mentor --> UC9
Mentor --> UC16

UC1 --> UC13 : <<include>>
UC2 --> A1 : <<include>>
UC2 --> A2 : <<include>>
UC2 --> A3 : <<include>>
UC2 --> A4 : <<include>>
UC2 --> A5 : <<include>>
UC2 --> A6 : <<include>>
UC2 --> UC13 : <<include>>
UC2 --> UC14 : <<extend>>

UC3 --> UC15 : <<include>>
UC4 --> UC15 : <<include>>
UC9 --> UC15 : <<include>>

UC10 --> UC11 : <<include>>
UC10 --> UC12 : <<include>>
A3 --> UC12 : <<include>>

UC5 --> UC6 : <<extend>>
UC5 --> UC7 : <<extend>>
UC5 --> UC8 : <<extend>>
UC8 --> UC17 : <<include>>
UC17 --> UC18 : <<include>>
UC18 --> UC2 : <<include>>
@enduml
