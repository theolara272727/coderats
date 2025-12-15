////////////////VARIAVEIS DE CONFIGURACAO
var handles = 
[
    "theo272727",
    "qqqw2",
    "marney",
    "vrrocha",
    "KaizerBlank",
]
initDate =1754606007;
////////////////
var main = document.getElementById('main');
var scoreList = document.getElementById('ranking');


handlesSolved = handles.reduce((acc,chave) =>{
    acc[chave] = [];
    return acc;
},{});

handlesRating = handles.reduce((acc,chave) =>{
    acc[chave] = [];
    return acc;
},{});
handlesScore = handles.reduce((acc,chave) =>{
    acc[chave] = 0;
    return acc;
},{});




index = 0;
for(let handle of handles){
    let newData = document.createElement('div');
    let newHandle = document.createElement('div');
    let newScore = document.createElement('div');

    newHandle.className = "item_text";
    newHandle.textContent = handle;
    
    newScore.className = "item_score";
    newScore.textContent = "-";
    newScore.id = handle + "/score"

    
    newData.id = handle + "/item";
    newData.className = "item_container";
    newData.style.order = index;

    newData.append(newHandle);
    newData.append(newScore);
    scoreList.append(newData);
    index++;
}

let top_problem = {};
top_problem['rating'] = 0;

function calculatePoints(handle){
    //atualiza o score
    for([rating,amount] of Object.entries(handlesRating[handle])){
        score = parseInt(rating)*(1+Math.log(amount)*2.5);
        currentScore = document.getElementById(handle + "/score");
        handlesScore[handle] += score;
        currentScore.textContent = handlesScore[handle].toFixed(2);
    }
    //ordena o array e atualiza a tabela;
    sortedScores = Object.fromEntries(Object.entries(handlesScore).sort(([,a],[,b]) => b - a));
    index = 0;
    for(handle of Object.keys(sortedScores)){
        currentHandle = document.getElementById(handle + "/item");
        currentHandle.style.order = index;
        index++;
    }

}

function updateTopProblem(){
    let topProblemElement = document.getElementById("top_problem");
    topProblemElement.innerHTML = "<b>Nome:</b> " + top_problem['name'] + "<br><b>Rating: </b>: "+ top_problem['rating'] 
    + "<br><b>Feito por: </b>"+ top_problem['handle'] + "<br><b>Tags: </b>";
    for(tag of top_problem['tags']){

        let newTag = document.createElement('span');
        newTag.className = 'tag';
        newTag.textContent = tag;
        topProblemElement.append(newTag);
    }
}
var problems_solved = [];

function updateLastSolvedProblems(){
    let lastSolvedTable = document.getElementById("last_solved_table");
    problems_solved.sort((a,b) => b.creationTimeSeconds - a.creationTimeSeconds);
    max = 10;
    i = 0;
    lastSolvedList = [];
    for(subJSON of problems_solved){
        if(i >= max){
            break;
        }
        lastSolvedList.push(subJSON)
        i++;
    }
    lastSolvedTable.innerHTML = "<tr><th>Problema</th><th>Rating</th><th>Data</th><th>Feito por</th><th>Pontuação</th></tr>";
    for(subJSON of lastSolvedList){
        data = new Date(subJSON.creationTimeSeconds*1000)
        lastSolvedTable.innerHTML += "<tr><td>" + subJSON.problem.name + '</td>' +"<td>" + subJSON.problem.rating + '</td>' +"<td>" + data.toDateString() + '</td>' +
        "<td>" + subJSON.handle + '</td>' +"<td style='color: green;font-weight: bold;'> +" + subJSON.pontuacao.toFixed(2) + '</td></tr>';
    }
}


for (let handle of handles){

    fetch("https://codeforces.com/api/user.status?handle="+handle+"&from=1&count=10000")
    .then((response) => {
        if(!response.ok){
            throw new Error(`HTTP error: ` + response.status)
        }
        else{
            return response.json();
        }
    })
    .then((sublistData) => {
        if (sublistData['status'] == "OK"){
            //Pega todas as submissões recentes accepted a partir de um certo dia
            for (let subJSON of sublistData['result']){
                if(subJSON['verdict'] == "OK"){
                    let problemName = subJSON['problem']['name'];
                    if(handlesSolved[handle].includes(problemName)){
                        continue;
                    }
                    else{
                        handlesSolved[handle].push(problemName);
                    }
                    if(subJSON['creationTimeSeconds'] > 1754606007){
                        if(subJSON['problem']['rating'] != undefined){
                            let rating = subJSON['problem']['rating'];
                            subJSON['handle'] = handle;
                            
                            if(rating > top_problem['rating']){
                                top_problem = subJSON['problem'];
                                top_problem['handle'] = handle;
                            }
                            if(rating in handlesRating[handle]){

                                handlesRating[handle][rating]++;
                                subJSON['pontuacao'] = parseInt(rating)*(1+Math.log(handlesRating[handle][rating])*2.5) - parseInt(rating)*(1+Math.log(handlesRating[handle][rating]-1)*2.5); 

                            }
                            else{
                                
                                handlesRating[handle][rating] = 1;
                                subJSON['pontuacao'] = parseInt(rating)*(1+Math.log(handlesRating[handle][rating])*2.5);
                            }
                            problems_solved.push(subJSON);
                        }   
                    }
                }
            }
        }
        calculatePoints(handle);
        updateTopProblem();
        updateLastSolvedProblems();
    })

}