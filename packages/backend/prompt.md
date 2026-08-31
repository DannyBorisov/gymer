- Dal service with google sheets

Create a dal service that uses google sheets as backend.
The dal should act like a normal database (models, queries etc)
The index file should export the models (inside) inside a class gsql.

models: 

- bodyWeight
- programs


Workout: { 
    name: String
    date?: Date
    duration?: String
    week: Number
    exercises: Exercise[]
    
}

Exercise: {
    name: String
    numberOfSets: Number
    targetReps: Number
    targetRir: Number
    achievedWeight: Number
    achievedReps: Number
    achievedRir: Number
    variant: String?
    notes:String|undefined[] as number of sets (undefined, string, undefined)

}

program: {
    numberOfWeeks: Number
    isComplete: Boolean
    Workouts: Workout[]
}

for instance:
```
gsql.bodyWeight.findAll()
gsql.bodyWeight.find(date)
gsql.bodyWeight.create({data: { weight }})
gsql.bodyWeight.update(date, { data:{ weight } })
```

Usully the date is the unqie identifier or name (or spreadsheet id). be smart and decide for each entity in database we should get.

for now lets ignore quick workouts layer as we dont use it yet.
ill figure it out later. Lets create a detailed plan to implement only the dal. dont apply it to the existing code. just create dal/ and the logic needs for that.
ask me anything that is not clear!

