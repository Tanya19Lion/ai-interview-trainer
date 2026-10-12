# SAD (fixture, скорочено для eval)

## Шари

`routes → controllers → services → models`, залежності тільку в цьому напрямку.

## Ідентифікатори

Проєкт використовує Mongo-native `_id` (`ObjectId`) усюди: `ref: 'User'` у
`InterviewSession.userId`, `_id` напряму в контролерах і роутах. Жодних
app-generated UUID немає.
